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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatadogDriver } from '../DatadogDriver';

const jsonResponse = (body: unknown) =>
  ({ ok: true, status: 200, statusText: 'OK', json: async () => body }) as Response;

const window = {
  since: '2026-01-01T00:00:00.000Z',
  until: '2026-01-01T01:00:00.000Z',
};

describe('DatadogDriver', () => {
  let fetchApi: ReturnType<typeof vi.fn>;
  let driver: DatadogDriver;

  beforeEach(() => {
    fetchApi = vi.fn();
    driver = new DatadogDriver({
      logger: mockServices.logger.mock(),
      config: {
        apiKey: 'dd-api',
        applicationKey: 'dd-app',
        apiBaseUrl: 'https://api.datadoghq.eu/',
        appBaseUrl: 'https://app.datadoghq.eu',
      },
      fetchApi: fetchApi as unknown as typeof fetch,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes the datadog provider identifier', () => {
    expect(driver.providerId).toBe('datadog');
  });

  it('sends both API keys on every request', async () => {
    fetchApi.mockResolvedValue(jsonResponse({ series: [] }));

    await driver.queryMetrics({ query: 'avg:http.latency{*}', ...window });

    const headers = fetchApi.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['DD-API-KEY']).toBe('dd-api');
    expect(headers['DD-APPLICATION-KEY']).toBe('dd-app');
  });

  it('converts metric windows to epoch seconds and points to ISO timestamps', async () => {
    fetchApi.mockResolvedValue(
      jsonResponse({
        series: [
          {
            metric: 'http.latency',
            unit: [{ name: 'millisecond' }],
            tag_set: ['service:checkout', 'env:prod'],
            pointlist: [
              [1767225600000, 12.5],
              [1767225660000, null],
            ],
          },
        ],
      }),
    );

    const series = await driver.queryMetrics({
      query: 'avg:http.latency{*}',
      ...window,
    });

    const url = fetchApi.mock.calls[0][0] as string;
    expect(url).toContain('from=1767225600');
    expect(url).toContain('to=1767229200');

    expect(series).toEqual([
      {
        metric: 'http.latency',
        unit: 'millisecond',
        labels: { service: 'checkout', env: 'prod' },
        points: [{ timestamp: '2026-01-01T00:00:00.000Z', value: 12.5 }],
      },
    ]);
  });

  it('builds an escaped log query and normalizes severities', async () => {
    fetchApi.mockResolvedValue(
      jsonResponse({
        data: [
          {
            attributes: {
              timestamp: '2026-01-01T00:30:00.000Z',
              status: 'Critical',
              service: 'checkout',
              message: 'boom',
              tags: ['env:prod'],
            },
          },
        ],
      }),
    );

    const logs = await driver.searchLogs({
      service: 'check"out',
      levels: ['error'],
      ...window,
    });

    const body = JSON.parse(fetchApi.mock.calls[0][1].body as string);
    expect(body.filter.query).toBe('service:"check\\"out" status:(error)');
    expect(body.page.limit).toBe(50);

    expect(logs).toEqual([
      {
        timestamp: '2026-01-01T00:30:00.000Z',
        level: 'fatal',
        service: 'checkout',
        message: 'boom',
        traceId: undefined,
        attributes: { env: 'prod' },
      },
    ]);
  });

  it('converts span durations from nanoseconds to milliseconds', async () => {
    fetchApi.mockResolvedValue(
      jsonResponse({
        data: [
          {
            attributes: {
              trace_id: 'T1',
              span_id: 'S1',
              service: 'checkout',
              resource_name: 'POST /pay',
              start_timestamp: '2026-01-01T00:30:00.000Z',
              duration: 1_500_000,
              tags: ['status:error', 'error.message:timeout'],
            },
          },
        ],
      }),
    );

    const spans = await driver.searchTraces({
      service: 'checkout',
      errorOnly: true,
      minDurationMs: 100,
      ...window,
    });

    const body = JSON.parse(fetchApi.mock.calls[0][1].body as string);
    expect(body.data.attributes.filter.query).toBe(
      'service:"checkout" status:error @duration:>100000000',
    );

    expect(spans).toEqual([
      {
        traceId: 'T1',
        spanId: 'S1',
        parentSpanId: undefined,
        operation: 'POST /pay',
        service: 'checkout',
        startedAt: '2026-01-01T00:30:00.000Z',
        durationMs: 1.5,
        error: true,
        statusMessage: 'timeout',
      },
    ]);
  });

  it('filters dashboards client side and builds absolute URLs', async () => {
    fetchApi.mockResolvedValue(
      jsonResponse({
        dashboards: [
          { id: 'abc', title: 'Checkout overview', url: '/dashboard/abc' },
          { id: 'def', title: 'Search overview', url: '/dashboard/def' },
        ],
      }),
    );

    const dashboards = await driver.listDashboards({ service: 'checkout' });

    expect(dashboards).toEqual([
      {
        id: 'abc',
        title: 'Checkout overview',
        description: undefined,
        url: 'https://app.datadoghq.eu/dashboard/abc',
      },
    ]);
  });

  it('applies a bounded default window when none is supplied', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T01:00:00.000Z'));
    fetchApi.mockResolvedValue(jsonResponse({ series: [] }));

    await driver.queryMetrics({ query: 'avg:http.latency{*}' });

    const url = fetchApi.mock.calls[0][0] as string;
    expect(url).toContain('from=1767225600');
    expect(url).toContain('to=1767229200');
  });

  it('rejects inverted and invalid time ranges before issuing a request', async () => {
    await expect(
      driver.queryMetrics({ query: 'x', since: window.until, until: window.since }),
    ).rejects.toThrow(/earlier than/);
    await expect(
      driver.queryMetrics({ query: 'x', since: 'not-a-date' }),
    ).rejects.toThrow(/ISO-8601/);
    expect(fetchApi).not.toHaveBeenCalled();
  });

  it('surfaces failures without the response body', async () => {
    fetchApi.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({}),
    } as Response);

    await expect(driver.listDashboards({})).rejects.toThrow(
      'Datadog request to /api/v1/dashboard failed with 403 Forbidden',
    );
  });
});
