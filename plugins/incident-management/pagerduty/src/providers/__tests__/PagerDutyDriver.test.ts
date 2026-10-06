/*
 * Copyright 2026 The AI Crew Suite Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { mockServices } from '@backstage/backend-test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PagerDutyDriver } from '../PagerDutyDriver';

const jsonResponse = (body: unknown) =>
  ({ ok: true, status: 200, statusText: 'OK', json: async () => body }) as Response;

const incident = {
  id: 'PINC1',
  incident_number: 42,
  title: 'Checkout latency spike',
  description: 'p99 doubled',
  status: 'resolved' as const,
  urgency: 'high' as const,
  created_at: '2026-01-01T00:00:00Z',
  resolved_at: '2026-01-01T01:00:00Z',
  html_url: 'https://acme.pagerduty.com/incidents/PINC1',
  incident_key: 'checkout-latency',
  service: { id: 'PSVC1', summary: 'checkout' },
  priority: { id: 'PPRI1', summary: 'P1' },
  teams: [{ id: 'PTEAM1', summary: 'payments' }],
  assignments: [
    { assignee: { id: 'PUSR1', type: 'user_reference', summary: 'Ada' } },
  ],
  acknowledgements: [{ at: '2026-01-01T00:10:00Z' }],
  last_status_change_by: { id: 'PUSR1', type: 'user_reference', summary: 'Ada' },
};

const createDriver = (fetchApi: ReturnType<typeof vi.fn>, fromEmail?: string) =>
  new PagerDutyDriver({
    logger: mockServices.logger.mock(),
    config: {
      apiToken: 'pd-secret',
      apiBaseUrl: 'https://api.pagerduty.com/',
      fromEmail,
    },
    fetchApi: fetchApi as unknown as typeof fetch,
  });

describe('PagerDutyDriver', () => {
  let fetchApi: ReturnType<typeof vi.fn>;
  let driver: PagerDutyDriver;

  beforeEach(() => {
    fetchApi = vi.fn();
    driver = createDriver(fetchApi);
  });

  it('exposes the pagerduty provider identifier', () => {
    expect(driver.providerId).toBe('pagerduty');
  });

  it('normalizes incidents and maps states to PagerDuty statuses', async () => {
    fetchApi.mockResolvedValue(jsonResponse({ incidents: [incident] }));

    const results = await driver.listIncidents({
      states: ['triggered', 'acknowledged'],
      limit: 10,
    });

    const url = fetchApi.mock.calls[0][0] as string;
    expect(url).toContain('statuses%5B%5D=triggered');
    expect(url).toContain('statuses%5B%5D=acknowledged');
    expect(url).toContain('limit=10');

    expect(results).toEqual([
      {
        id: 'PINC1',
        title: 'Checkout latency spike',
        state: 'resolved',
        status: 'resolved',
        severity: 'P1',
        service: 'checkout',
        team: 'payments',
        assignees: [{ id: 'PUSR1', displayName: 'Ada', email: undefined }],
        url: 'https://acme.pagerduty.com/incidents/PINC1',
        triggeredAt: '2026-01-01T00:00:00Z',
        acknowledgedAt: '2026-01-01T00:10:00Z',
        resolvedAt: '2026-01-01T01:00:00Z',
      },
    ]);
  });

  it('resolves a service name to service IDs before querying incidents', async () => {
    fetchApi
      .mockResolvedValueOnce(jsonResponse({ services: [{ id: 'PSVC1' }] }))
      .mockResolvedValueOnce(jsonResponse({ incidents: [] }));

    await driver.listIncidents({ service: 'checkout' });

    expect(fetchApi.mock.calls[0][0]).toContain('/services?query=checkout');
    expect(fetchApi.mock.calls[1][0]).toContain('service_ids%5B%5D=PSVC1');
  });

  it('does not widen the incident query when a service matches nothing', async () => {
    fetchApi
      .mockResolvedValueOnce(jsonResponse({ services: [] }))
      .mockResolvedValueOnce(jsonResponse({ incidents: [] }));

    await driver.listIncidents({ service: 'missing' });

    expect(fetchApi.mock.calls[1][0]).toContain('service_ids%5B%5D=__no_match__');
  });

  it('expands notes on getIncident', async () => {
    fetchApi
      .mockResolvedValueOnce(jsonResponse({ incident }))
      .mockResolvedValueOnce(
        jsonResponse({
          notes: [
            {
              id: 'PNOTE1',
              content: 'rolled back',
              created_at: '2026-01-01T00:30:00Z',
              user: { id: 'PUSR1', summary: 'Ada' },
            },
          ],
        }),
      );

    const detail = await driver.getIncident('PINC1');

    expect(detail.description).toBe('p99 doubled');
    expect(detail.notes).toEqual([
      {
        id: 'PNOTE1',
        author: { id: 'PUSR1', displayName: 'Ada', email: undefined },
        body: 'rolled back',
        createdAt: '2026-01-01T00:30:00Z',
      },
    ]);
  });

  it('classifies resolution kind from the final status change agent', async () => {
    fetchApi.mockResolvedValue(
      jsonResponse({
        incidents: [
          incident,
          {
            ...incident,
            id: 'PINC2',
            last_status_change_by: { id: 'PSVC1', type: 'service_reference' },
          },
          { ...incident, id: 'PINC3', status: 'triggered', resolved_at: null },
        ],
      }),
    );

    const history = await driver.getAlertHistory({});

    expect(history.map(entry => entry.resolution)).toEqual([
      'manual',
      'auto',
      'unresolved',
    ]);
    expect(history[0].paged).toBe(true);
  });

  it('resolves on-call shifts through the escalation policy of a service', async () => {
    fetchApi
      .mockResolvedValueOnce(
        jsonResponse({
          services: [{ id: 'PSVC1', escalation_policy: { id: 'PPOL1' } }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          oncalls: [
            {
              user: { id: 'PUSR1', summary: 'Ada', email: 'ada@acme.io' },
              escalation_policy: { id: 'PPOL1', summary: 'Checkout' },
              escalation_level: 1,
              start: '2026-01-01T00:00:00Z',
              end: '2026-01-08T00:00:00Z',
            },
          ],
        }),
      );

    const shifts = await driver.getOnCallShifts({ service: 'checkout' });

    expect(fetchApi.mock.calls[1][0]).toContain('escalation_policy_ids%5B%5D=PPOL1');
    expect(shifts).toEqual([
      {
        responder: { id: 'PUSR1', displayName: 'Ada', email: 'ada@acme.io' },
        policyId: 'PPOL1',
        policyName: 'Checkout',
        escalationLevel: 1,
        start: '2026-01-01T00:00:00Z',
        end: '2026-01-08T00:00:00Z',
      },
    ]);
  });

  it('returns no shifts rather than every shift when a filter matches nothing', async () => {
    fetchApi.mockResolvedValueOnce(jsonResponse({ services: [] }));

    await expect(
      driver.getOnCallShifts({ service: 'missing' }),
    ).resolves.toEqual([]);
    expect(fetchApi).toHaveBeenCalledTimes(1);
  });

  it('requires fromEmail before annotating an incident', async () => {
    await expect(driver.annotateIncident('PINC1', 'note')).rejects.toThrow(
      /fromEmail/,
    );
    expect(fetchApi).not.toHaveBeenCalled();
  });

  it('sends the From header when annotating an incident', async () => {
    fetchApi.mockResolvedValue(
      jsonResponse({ note: { id: 'PNOTE1', content: 'note' } }),
    );

    await createDriver(fetchApi, 'bot@acme.io').annotateIncident('PINC1', 'note');

    const [, init] = fetchApi.mock.calls[0];
    expect((init.headers as Record<string, string>)['From']).toBe('bot@acme.io');
    expect((init.headers as Record<string, string>)['Authorization']).toBe(
      'Token token=pd-secret',
    );
    expect(JSON.parse(init.body as string)).toEqual({
      note: { content: 'note' },
    });
  });

  it('surfaces failures without the response body', async () => {
    fetchApi.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({}),
    } as Response);

    await expect(driver.listIncidents({})).rejects.toThrow(
      /PagerDuty request to \/incidents\?.* failed with 401 Unauthorized/,
    );
  });
});
