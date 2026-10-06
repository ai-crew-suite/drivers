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
import { LoggerService } from '@backstage/backend-plugin-api';
import {
  CommunicationChannel,
  MessageHistoryQuery,
  CommunicationMessage,
  CommunicationDriver,
  PostMessageInput,
} from '@ai-crew-suite/plugin-kernel-node';

/**
 * Connection settings for the Slack messaging driver.
 */
export type SlackDriverConfig = {
  /** Slack bot user OAuth token. */
  token: string;
  /** Slack Web API base URL. Defaults to `https://slack.com/api`. */
  apiBaseUrl?: string;
  /** Workspace domain used to build message deep links. */
  workspaceDomain?: string;
};

export interface SlackDriverOptions {
  logger: LoggerService;
  config: SlackDriverConfig;
  /** Injectable fetch implementation, primarily for tests. */
  fetchApi?: typeof fetch;
}

const DEFAULT_API_BASE_URL = 'https://slack.com/api';
const PAGE_SIZE = 200;
const MAX_PAGES = 10;

type SlackResponse = {
  ok: boolean;
  error?: string;
  response_metadata?: { next_cursor?: string };
};

type SlackChannel = { id: string; name: string; is_archived?: boolean };

type SlackMessage = {
  ts?: string;
  user?: string;
  bot_id?: string;
  username?: string;
  text?: string;
  thread_ts?: string;
};

/** Slack channel names are lowercase and hyphenated, so lookups normalize input. */
const normalizeChannelName = (value: string): string =>
  value.trim().replace(/^#/, '').toLowerCase().replace(/[\s_]+/g, '-');

const tsToIso = (ts?: string): string | undefined =>
  ts ? new Date(Number(ts.split('.')[0]) * 1000).toISOString() : undefined;

/**
 * Slack Web API implementation of the provider-neutral messaging driver.
 */
export class SlackDriver implements CommunicationDriver {
  readonly providerId = 'slack';

  private readonly logger: LoggerService;
  private readonly apiBaseUrl: string;
  private readonly token: string;
  private readonly workspaceDomain?: string;
  private readonly fetchApi: typeof fetch;

  constructor(options: SlackDriverOptions) {
    const { logger, config, fetchApi } = options;
    this.logger = logger;
    this.token = config.token;
    this.apiBaseUrl = (config.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '');
    this.workspaceDomain = config.workspaceDomain;
    this.fetchApi = fetchApi ?? fetch;
  }

  async lookupChannel(
    teamOrService: string,
  ): Promise<CommunicationChannel | undefined> {
    const target = normalizeChannelName(teamOrService);
    let cursor: string | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const response = await this.get<
        SlackResponse & { channels?: SlackChannel[] }
      >('conversations.list', {
        types: 'public_channel,private_channel',
        exclude_archived: 'true',
        limit: String(PAGE_SIZE),
        ...(cursor ? { cursor } : {}),
      });

      const match = (response.channels ?? []).find(
        channel => channel.name === target,
      );

      if (match) {
        return {
          id: match.id,
          name: match.name,
          url: this.workspaceDomain
            ? `https://${this.workspaceDomain}/archives/${match.id}`
            : undefined,
        };
      }

      cursor = response.response_metadata?.next_cursor || undefined;
      if (!cursor) break;
    }

    this.logger.debug(`No Slack channel matched '${teamOrService}'`);
    return undefined;
  }

  async postMessage(
    input: PostMessageInput,
  ): Promise<{ messageId: string; url?: string }> {
    const response = await this.post<SlackResponse & { ts?: string }>(
      'chat.postMessage',
      {
        channel: input.channelId,
        text: input.text,
        ...(input.threadId ? { thread_ts: input.threadId } : {}),
      },
    );

    const ts = response.ts ?? '';

    return {
      messageId: ts,
      url: this.messageUrl(input.channelId, ts),
    };
  }

  async getChannelHistory(
    query: MessageHistoryQuery,
  ): Promise<CommunicationMessage[]> {
    const limit = Math.min(query.limit ?? 50, PAGE_SIZE);
    const oldest = query.since
      ? String(Math.floor(new Date(query.since).getTime() / 1000))
      : undefined;

    const response = query.threadId
      ? await this.get<SlackResponse & { messages?: SlackMessage[] }>(
          'conversations.replies',
          {
            channel: query.channelId,
            ts: query.threadId,
            limit: String(limit),
            ...(oldest ? { oldest } : {}),
          },
        )
      : await this.get<SlackResponse & { messages?: SlackMessage[] }>(
          'conversations.history',
          {
            channel: query.channelId,
            limit: String(limit),
            ...(oldest ? { oldest } : {}),
          },
        );

    return (response.messages ?? []).map(message => ({
      id: message.ts ?? '',
      channelId: query.channelId,
      author: {
        id: message.user ?? message.bot_id ?? 'unknown',
        displayName: message.username,
      },
      text: message.text ?? '',
      createdAt: tsToIso(message.ts),
      threadId: message.thread_ts,
      url: this.messageUrl(query.channelId, message.ts ?? ''),
    }));
  }

  private messageUrl(channelId: string, ts: string): string | undefined {
    if (!this.workspaceDomain || !ts) return undefined;
    return `https://${this.workspaceDomain}/archives/${channelId}/p${ts.replace('.', '')}`;
  }

  private async get<T extends SlackResponse>(
    method: string,
    params: Record<string, string>,
  ): Promise<T> {
    return this.request<T>(`${method}?${new URLSearchParams(params)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.token}` },
    });
  }

  private async post<T extends SlackResponse>(
    method: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    return this.request<T>(method, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    });
  }

  private async request<T extends SlackResponse>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    const response = await this.fetchApi(`${this.apiBaseUrl}/${path}`, init);

    if (!response.ok) {
      throw new Error(
        `Slack request to ${path} failed with ${response.status} ${response.statusText}`,
      );
    }

    // Slack signals application errors with HTTP 200 and `ok: false`.
    const payload = (await response.json()) as T;
    if (!payload.ok) {
      throw new Error(
        `Slack request to ${path} failed: ${payload.error ?? 'unknown_error'}`,
      );
    }

    return payload;
  }
}
