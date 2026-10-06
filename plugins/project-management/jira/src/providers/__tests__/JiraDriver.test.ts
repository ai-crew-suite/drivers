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
import { JiraDriver } from '../JiraDriver';

const jsonResponse = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
  }) as Response;

const issue = {
  id: '1000',
  key: 'OPS-1',
  fields: {
    summary: 'Checkout latency spike',
    description: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'p99 doubled' }] },
      ],
    },
    status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } },
    priority: { name: 'High' },
    labels: ['incident'],
    assignee: { accountId: 'acc-1', displayName: 'Ada', emailAddress: 'ada@x.io' },
    reporter: { accountId: 'acc-2', displayName: 'Grace' },
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-02T00:00:00.000Z',
    parent: { key: 'OPS-100' },
    project: { key: 'OPS' },
    comment: {
      comments: [
        {
          id: '5',
          author: { accountId: 'acc-2', displayName: 'Grace' },
          body: {
            type: 'doc',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'rolled back' }] },
            ],
          },
          created: '2026-01-02T00:00:00.000Z',
        },
      ],
    },
  },
  changelog: {
    histories: [
      {
        created: '2026-01-02T00:00:00.000Z',
        items: [
          {
            field: 'assignee',
            from: 'acc-2',
            fromString: 'Grace',
            to: 'acc-1',
            toString: 'Ada',
          },
        ],
      },
    ],
  },
};

describe('JiraDriver', () => {
  let fetchApi: ReturnType<typeof vi.fn>;
  let driver: JiraDriver;

  const createDriver = () =>
    new JiraDriver({
      logger: mockServices.logger.mock(),
      config: {
        baseUrl: 'https://acme.atlassian.net/',
        email: 'bot@acme.io',
        apiToken: 'secret-token',
        defaultProjectKey: 'OPS',
      },
      fetchApi: fetchApi as unknown as typeof fetch,
    });

  beforeEach(() => {
    fetchApi = vi.fn();
    driver = createDriver();
  });

  it('exposes the jira provider identifier', () => {
    expect(driver.providerId).toBe('jira');
  });

  it('normalizes search results and builds an escaped JQL query', async () => {
    fetchApi.mockResolvedValue(jsonResponse({ issues: [issue] }));

    const results = await driver.searchTickets({
      text: 'say "hi"',
      team: 'OPS',
      states: ['open', 'in_progress'],
      limit: 5,
    });

    const [url, init] = fetchApi.mock.calls[0];
    expect(url).toBe('https://acme.atlassian.net/rest/api/3/search/jql');

    const body = JSON.parse(init.body as string);
    expect(body.jql).toBe(
      'text ~ "say \\"hi\\"" AND project = "OPS" AND statusCategory in ("new", "indeterminate") ORDER BY updated DESC',
    );
    expect(body.maxResults).toBe(5);

    expect(results).toEqual([
      {
        id: 'OPS-1',
        title: 'Checkout latency spike',
        state: 'in_progress',
        status: 'In Progress',
        priority: 'High',
        labels: ['incident'],
        assignee: { id: 'acc-1', displayName: 'Ada', email: 'ada@x.io' },
        reporter: { id: 'acc-2', displayName: 'Grace', email: undefined },
        team: 'OPS',
        parentId: 'OPS-100',
        url: 'https://acme.atlassian.net/browse/OPS-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
  });

  it('expands description, comments, and assignee history on getTicket', async () => {
    fetchApi.mockResolvedValue(jsonResponse(issue));

    const detail = await driver.getTicket('OPS-1');

    expect(fetchApi.mock.calls[0][0]).toContain(
      '/rest/api/3/issue/OPS-1?fields=',
    );
    expect(fetchApi.mock.calls[0][0]).toContain('expand=changelog');
    expect(detail.description).toBe('p99 doubled');
    expect(detail.comments).toEqual([
      {
        id: '5',
        author: { id: 'acc-2', displayName: 'Grace', email: undefined },
        body: 'rolled back',
        createdAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
    expect(detail.assigneeHistory).toEqual([
      {
        changedAt: '2026-01-02T00:00:00.000Z',
        from: { id: 'acc-2', displayName: 'Grace' },
        to: { id: 'acc-1', displayName: 'Ada' },
      },
    ]);
  });

  it('creates a ticket in the default project and reloads it', async () => {
    fetchApi
      .mockResolvedValueOnce(jsonResponse({ key: 'OPS-1' }))
      .mockResolvedValueOnce(jsonResponse(issue));

    const created = await driver.createTicket({
      title: 'Checkout latency spike',
      description: 'p99 doubled',
    });

    const body = JSON.parse(fetchApi.mock.calls[0][1].body as string);
    expect(body.fields.project).toEqual({ key: 'OPS' });
    expect(body.fields.issuetype).toEqual({ name: 'Task' });
    expect(created.id).toBe('OPS-1');
  });

  it('rejects ticket creation without a resolvable project', async () => {
    const driverWithoutDefault = new JiraDriver({
      logger: mockServices.logger.mock(),
      config: {
        baseUrl: 'https://acme.atlassian.net',
        email: 'bot@acme.io',
        apiToken: 'secret-token',
      },
      fetchApi: fetchApi as unknown as typeof fetch,
    });

    await expect(
      driverWithoutDefault.createTicket({ title: 'x' }),
    ).rejects.toThrow(/requires a target project/);
    expect(fetchApi).not.toHaveBeenCalled();
  });

  it('authenticates with a basic auth header and surfaces failures without the body', async () => {
    fetchApi.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({}),
    } as Response);

    await expect(driver.getTicket('OPS-1')).rejects.toThrow(
      /^Jira request to \/rest\/api\/3\/issue\/OPS-1\?fields=.* failed with 401 Unauthorized$/,
    );

    const headers = fetchApi.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from('bot@acme.io:secret-token').toString('base64')}`,
    );
  });
});
