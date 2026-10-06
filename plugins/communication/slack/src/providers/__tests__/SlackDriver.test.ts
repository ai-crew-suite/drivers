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
import { SlackDriver } from '../SlackDriver';

const jsonResponse = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
  }) as Response;

describe('SlackDriver', () => {
  let fetchApi: ReturnType<typeof vi.fn>;
  let driver: SlackDriver;

  beforeEach(() => {
    fetchApi = vi.fn();
    driver = new SlackDriver({
      logger: mockServices.logger.mock(),
      config: {
        token: 'xoxb-secret',
        workspaceDomain: 'acme.slack.com',
      },
      fetchApi: fetchApi as unknown as typeof fetch,
    });
  });

  it('exposes the slack provider identifier', () => {
    expect(driver.providerId).toBe('slack');
  });

  it('normalizes the requested name and paginates channel lookup', async () => {
    fetchApi
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          channels: [{ id: 'C1', name: 'general' }],
          response_metadata: { next_cursor: 'cursor-2' },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          channels: [{ id: 'C2', name: 'checkout-oncall' }],
        }),
      );

    const channel = await driver.lookupChannel('#Checkout OnCall');

    expect(fetchApi.mock.calls[1][0]).toContain('cursor=cursor-2');
    expect(channel).toEqual({
      id: 'C2',
      name: 'checkout-oncall',
      url: 'https://acme.slack.com/archives/C2',
    });
  });

  it('returns undefined when no channel matches', async () => {
    fetchApi.mockResolvedValue(jsonResponse({ ok: true, channels: [] }));

    await expect(driver.lookupChannel('missing')).resolves.toBeUndefined();
  });

  it('posts a threaded message with a bearer token', async () => {
    fetchApi.mockResolvedValue(jsonResponse({ ok: true, ts: '1700000000.000100' }));

    const result = await driver.postMessage({
      channelId: 'C1',
      text: 'run summary',
      threadId: '1699999999.000100',
    });

    const [url, init] = fetchApi.mock.calls[0];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer xoxb-secret',
    );
    expect(JSON.parse(init.body as string)).toEqual({
      channel: 'C1',
      text: 'run summary',
      thread_ts: '1699999999.000100',
    });
    expect(result).toEqual({
      messageId: '1700000000.000100',
      url: 'https://acme.slack.com/archives/C1/p1700000000000100',
    });
  });

  it('reads thread replies and normalizes timestamps', async () => {
    fetchApi.mockResolvedValue(
      jsonResponse({
        ok: true,
        messages: [
          {
            ts: '1700000000.000100',
            user: 'U1',
            text: 'rolling back',
            thread_ts: '1700000000.000100',
          },
        ],
      }),
    );

    const messages = await driver.getChannelHistory({
      channelId: 'C1',
      threadId: '1700000000.000100',
      since: '2023-11-14T00:00:00.000Z',
    });

    expect(fetchApi.mock.calls[0][0]).toContain('conversations.replies');
    expect(fetchApi.mock.calls[0][0]).toContain('oldest=1699920000');
    expect(messages).toEqual([
      {
        id: '1700000000.000100',
        channelId: 'C1',
        author: { id: 'U1', displayName: undefined },
        text: 'rolling back',
        createdAt: '2023-11-14T22:13:20.000Z',
        threadId: '1700000000.000100',
        url: 'https://acme.slack.com/archives/C1/p1700000000000100',
      },
    ]);
  });

  it('reads channel history when no thread is supplied', async () => {
    fetchApi.mockResolvedValue(jsonResponse({ ok: true, messages: [] }));

    await driver.getChannelHistory({ channelId: 'C1' });

    expect(fetchApi.mock.calls[0][0]).toContain('conversations.history');
  });

  it('raises Slack application errors returned with HTTP 200', async () => {
    fetchApi.mockResolvedValue(
      jsonResponse({ ok: false, error: 'channel_not_found' }),
    );

    await expect(
      driver.postMessage({ channelId: 'C1', text: 'x' }),
    ).rejects.toThrow('Slack request to chat.postMessage failed: channel_not_found');
  });
});
