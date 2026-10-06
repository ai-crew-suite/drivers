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
  ServiceActor,
  CreateTicketInput,
  TicketAssigneeChange,
  TicketComment,
  TicketDetail,
  ProjectManagementDriver,
  TicketSearchQuery,
  TicketState,
  TicketSummary,
} from '@ai-crew-suite/plugin-kernel-node';

/**
 * Connection settings for the Jira ticket driver.
 */
export type JiraDriverConfig = {
  /** Jira site base URL, such as `https://my-org.atlassian.net`. */
  baseUrl: string;
  /** Atlassian account email used for basic authentication. */
  email: string;
  /** Atlassian API token used for basic authentication. */
  apiToken: string;
  /** Project key used when a tool call does not supply a target team. */
  defaultProjectKey?: string;
  /** Issue type name used when creating tickets. Defaults to `Task`. */
  defaultIssueType?: string;
};

export interface JiraDriverOptions {
  logger: LoggerService;
  config: JiraDriverConfig;
  /** Injectable fetch implementation, primarily for tests. */
  fetchApi?: typeof fetch;
}

const MAX_RESULTS = 50;

const ISSUE_FIELDS = [
  'summary',
  'status',
  'priority',
  'labels',
  'assignee',
  'reporter',
  'created',
  'updated',
  'parent',
  'project',
];

type JiraUser = {
  accountId?: string;
  displayName?: string;
  emailAddress?: string;
};

type JiraIssue = {
  id: string;
  key: string;
  fields: {
    summary?: string;
    description?: unknown;
    status?: { name?: string; statusCategory?: { key?: string } };
    priority?: { name?: string };
    labels?: string[];
    assignee?: JiraUser | null;
    reporter?: JiraUser | null;
    created?: string;
    updated?: string;
    parent?: { key?: string };
    project?: { key?: string };
    comment?: { comments?: JiraComment[] };
  };
  changelog?: {
    histories?: {
      created?: string;
      items?: {
        field?: string;
        fromString?: string | null;
        toString?: string | null;
        from?: string | null;
        to?: string | null;
      }[];
    }[];
  };
};

type JiraComment = {
  id?: string;
  author?: JiraUser;
  body?: unknown;
  created?: string;
};

/**
 * Escapes a value for safe interpolation into a quoted JQL string literal.
 */
const quoteJql = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/**
 * Maps a Jira status category to the provider-neutral ticket state.
 */
const toTicketState = (issue: JiraIssue): TicketState => {
  switch (issue.fields.status?.statusCategory?.key) {
    case 'new':
      return 'open';
    case 'indeterminate':
      return 'in_progress';
    case 'done':
      return 'done';
    default:
      return 'open';
  }
};

const STATE_TO_CATEGORY: Record<TicketState, string | undefined> = {
  open: 'new',
  in_progress: 'indeterminate',
  blocked: 'indeterminate',
  done: 'done',
  closed: 'done',
};

const toActor = (user?: JiraUser | null): ServiceActor | undefined =>
  user
    ? {
        id: user.accountId ?? user.displayName ?? 'unknown',
        displayName: user.displayName,
        email: user.emailAddress,
      }
    : undefined;

/**
 * Flattens an Atlassian Document Format node tree into plain text.
 */
const adfToText = (node: unknown): string => {
  if (!node || typeof node !== 'object') return '';

  const typed = node as { type?: string; text?: string; content?: unknown[] };
  if (typeof typed.text === 'string') return typed.text;

  const inner = Array.isArray(typed.content)
    ? typed.content.map(adfToText).join('')
    : '';

  return typed.type === 'paragraph' || typed.type === 'heading'
    ? `${inner}\n`
    : inner;
};

/**
 * Wraps plain text in a minimal Atlassian Document Format document.
 */
const textToAdf = (text: string) => ({
  type: 'doc',
  version: 1,
  content: text.split('\n').map(line => ({
    type: 'paragraph',
    content: line ? [{ type: 'text', text: line }] : [],
  })),
});

/**
 * Jira Cloud implementation of the provider-neutral ticket driver.
 */
export class JiraDriver implements ProjectManagementDriver {
  readonly providerId = 'jira';

  private readonly logger: LoggerService;
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly defaultProjectKey?: string;
  private readonly defaultIssueType: string;
  private readonly fetchApi: typeof fetch;

  constructor(options: JiraDriverOptions) {
    const { logger, config, fetchApi } = options;
    this.logger = logger;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.authHeader = `Basic ${Buffer.from(
      `${config.email}:${config.apiToken}`,
    ).toString('base64')}`;
    this.defaultProjectKey = config.defaultProjectKey;
    this.defaultIssueType = config.defaultIssueType ?? 'Task';
    this.fetchApi = fetchApi ?? fetch;
  }

  async searchTickets(query: TicketSearchQuery): Promise<TicketSummary[]> {
    const clauses: string[] = [];

    if (query.text) clauses.push(`text ~ ${quoteJql(query.text)}`);
    if (query.team) clauses.push(`project = ${quoteJql(query.team)}`);
    if (query.assignee) clauses.push(`assignee = ${quoteJql(query.assignee)}`);
    if (query.labels?.length) {
      clauses.push(
        `labels in (${query.labels.map(label => quoteJql(label)).join(', ')})`,
      );
    }
    if (query.states?.length) {
      const categories = [
        ...new Set(
          query.states
            .map(state => STATE_TO_CATEGORY[state])
            .filter((category): category is string => Boolean(category)),
        ),
      ];
      if (categories.length) {
        clauses.push(
          `statusCategory in (${categories.map(quoteJql).join(', ')})`,
        );
      }
    }

    const response = await this.request<{ issues?: JiraIssue[] }>(
      '/rest/api/3/search/jql',
      {
        method: 'POST',
        body: JSON.stringify({
          jql: clauses.length
            ? `${clauses.join(' AND ')} ORDER BY updated DESC`
            : 'ORDER BY updated DESC',
          maxResults: Math.min(query.limit ?? 25, MAX_RESULTS),
          fields: ISSUE_FIELDS,
        }),
      },
    );

    return (response.issues ?? []).map(issue => this.toSummary(issue));
  }

  async getTicket(ticketId: string): Promise<TicketDetail> {
    const params = new URLSearchParams({
      fields: [...ISSUE_FIELDS, 'description', 'comment'].join(','),
      expand: 'changelog',
    });

    const issue = await this.request<JiraIssue>(
      `/rest/api/3/issue/${encodeURIComponent(ticketId)}?${params}`,
    );

    return {
      ...this.toSummary(issue),
      description: adfToText(issue.fields.description).trim() || undefined,
      comments: (issue.fields.comment?.comments ?? []).map(comment =>
        this.toComment(comment),
      ),
      assigneeHistory: this.toAssigneeHistory(issue),
    };
  }

  async createTicket(input: CreateTicketInput): Promise<TicketSummary> {
    const projectKey = input.team ?? this.defaultProjectKey;
    if (!projectKey) {
      throw new Error(
        'Jira ticket creation requires a target project. Supply `team` or set ai.integrations.projectManagement.jira.defaultProjectKey',
      );
    }

    const created = await this.request<{ key: string }>('/rest/api/3/issue', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary: input.title,
          issuetype: { name: this.defaultIssueType },
          ...(input.description
            ? { description: textToAdf(input.description) }
            : {}),
          ...(input.labels?.length ? { labels: input.labels } : {}),
          ...(input.priority ? { priority: { name: input.priority } } : {}),
          ...(input.parentId ? { parent: { key: input.parentId } } : {}),
        },
      }),
    });

    this.logger.info(`Created Jira issue ${created.key}`);

    return this.getTicket(created.key);
  }

  async commentTicket(
    ticketId: string,
    comment: string,
  ): Promise<TicketComment> {
    const created = await this.request<JiraComment>(
      `/rest/api/3/issue/${encodeURIComponent(ticketId)}/comment`,
      {
        method: 'POST',
        body: JSON.stringify({ body: textToAdf(comment) }),
      },
    );

    return this.toComment(created);
  }

  private toSummary(issue: JiraIssue): TicketSummary {
    return {
      id: issue.key,
      title: issue.fields.summary ?? '',
      state: toTicketState(issue),
      status: issue.fields.status?.name,
      priority: issue.fields.priority?.name,
      labels: issue.fields.labels,
      assignee: toActor(issue.fields.assignee),
      reporter: toActor(issue.fields.reporter),
      team: issue.fields.project?.key,
      parentId: issue.fields.parent?.key,
      url: `${this.baseUrl}/browse/${issue.key}`,
      createdAt: issue.fields.created,
      updatedAt: issue.fields.updated,
    };
  }

  private toComment(comment: JiraComment): TicketComment {
    return {
      id: comment.id,
      author: toActor(comment.author) ?? { id: 'unknown' },
      body: adfToText(comment.body).trim(),
      createdAt: comment.created,
    };
  }

  private toAssigneeHistory(issue: JiraIssue): TicketAssigneeChange[] {
    const changes: TicketAssigneeChange[] = [];

    for (const history of issue.changelog?.histories ?? []) {
      for (const item of history.items ?? []) {
        if (item.field !== 'assignee' || !history.created) continue;

        changes.push({
          changedAt: history.created,
          from: item.from
            ? { id: item.from, displayName: item.fromString ?? undefined }
            : undefined,
          to: item.to
            ? { id: item.to, displayName: item.toString ?? undefined }
            : undefined,
        });
      }
    }

    return changes.sort((a, b) => a.changedAt.localeCompare(b.changedAt));
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetchApi(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (!response.ok) {
      // Response bodies can echo request content, so only the status line is surfaced.
      throw new Error(
        `Jira request to ${path} failed with ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as T;
  }
}
