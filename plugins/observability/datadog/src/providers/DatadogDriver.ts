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
  DashboardLink,
  DashboardQuery,
  LogEntry,
  LogLevel,
  LogQuery,
  MetricSeries,
  MetricsQuery,
  ObservabilityDriver,
  TraceQuery,
  TraceSpan,
} from '@ai-crew-suite/plugin-kernel-node';

/**
 * Connection settings for the Datadog observability driver.
 */
export type DatadogDriverConfig = {
  /** Datadog API key. */
  apiKey: string;
  /** Datadog application key, required for read endpoints. */
  applicationKey: string;
  /** API base URL. Defaults to `https://api.datadoghq.com`. */
  apiBaseUrl?: string;
  /** Web app base URL used to build dashboard links. Defaults to `https://app.datadoghq.com`. */
  appBaseUrl?: string;
};

export interface DatadogDriverOptions {
  logger: LoggerService;
  config: DatadogDriverConfig;
  /** Injectable fetch implementation, primarily for tests. */
  fetchApi?: typeof fetch;
}

const DEFAULT_API_BASE_URL = 'https://api.datadoghq.com';
const DEFAULT_APP_BASE_URL = 'https://app.datadoghq.com';
const MAX_LIMIT = 1000;
const DEFAULT_LOOKBACK_MS = 60 * 60 * 1000;

type DatadogSeries = {
  metric?: string;
  unit?: ({ name?: string } | null)[];
  tag_set?: string[];
  scope?: string;
  pointlist?: [number, number | null][];
};

type DatadogLogEvent = {
  id?: string;
  attributes?: {
    timestamp?: string;
    status?: string;
    service?: string;
    message?: string;
    tags?: string[];
    attributes?: Record<string, unknown>;
  };
};

type DatadogSpanEvent = {
  id?: string;
  attributes?: {
    trace_id?: string;
    span_id?: string;
    parent_id?: string;
    service?: string;
    resource_name?: string;
    start_timestamp?: string;
    duration?: number;
    custom?: Record<string, unknown>;
    attributes?: Record<string, unknown>;
    tags?: string[];
  };
};

type DatadogDashboard = {
  id?: string;
  title?: string;
  description?: string | null;
  url?: string;
};

const LOG_LEVELS: Record<string, LogLevel> = {
  debug: 'debug',
  info: 'info',
  notice: 'info',
  warn: 'warn',
  warning: 'warn',
  error: 'error',
  critical: 'fatal',
  alert: 'fatal',
  emergency: 'fatal',
};

const toLogLevel = (status?: string): LogLevel | undefined =>
  status ? LOG_LEVELS[status.toLowerCase()] : undefined;

/**
 * Datadog tag lists arrive as `key:value` strings.
 */
const tagsToRecord = (tags?: string[]): Record<string, string> | undefined => {
  if (!tags?.length) return undefined;

  const record: Record<string, string> = {};
  for (const tag of tags) {
    const separator = tag.indexOf(':');
    if (separator > 0) record[tag.slice(0, separator)] = tag.slice(separator + 1);
  }

  return Object.keys(record).length ? record : undefined;
};

const escapeQueryValue = (value: string): string => `"${value.replace(/"/g, '\\"')}"`;

/**
 * Datadog implementation of the provider-neutral observability driver.
 */
export class DatadogDriver implements ObservabilityDriver {
  readonly providerId = 'datadog';

  private readonly logger: LoggerService;
  private readonly apiBaseUrl: string;
  private readonly appBaseUrl: string;
  private readonly apiKey: string;
  private readonly applicationKey: string;
  private readonly fetchApi: typeof fetch;

  constructor(options: DatadogDriverOptions) {
    const { logger, config, fetchApi } = options;
    this.logger = logger;
    this.apiKey = config.apiKey;
    this.applicationKey = config.applicationKey;
    this.apiBaseUrl = (config.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '');
    this.appBaseUrl = (config.appBaseUrl ?? DEFAULT_APP_BASE_URL).replace(/\/+$/, '');
    this.fetchApi = fetchApi ?? fetch;
  }

  async queryMetrics(query: MetricsQuery): Promise<MetricSeries[]> {
    const { from, to } = this.resolveWindow(query.since, query.until);

    const params = new URLSearchParams({
      from: String(Math.floor(from / 1000)),
      to: String(Math.floor(to / 1000)),
      query: query.query,
    });

    const response = await this.request<{ series?: DatadogSeries[] }>(
      `/api/v1/query?${params}`,
      { method: 'GET' },
    );

    return (response.series ?? []).map(series => ({
      metric: series.metric ?? query.query,
      labels: tagsToRecord(series.tag_set),
      unit: series.unit?.[0]?.name,
      points: (series.pointlist ?? [])
        .filter((point): point is [number, number] => point[1] !== null)
        .map(([timestamp, value]) => ({
          timestamp: new Date(timestamp).toISOString(),
          value,
        })),
    }));
  }

  async searchLogs(query: LogQuery): Promise<LogEntry[]> {
    const { from, to } = this.resolveWindow(query.since, query.until);

    const clauses: string[] = [];
    if (query.query) clauses.push(query.query);
    if (query.service) clauses.push(`service:${escapeQueryValue(query.service)}`);
    if (query.levels?.length) {
      clauses.push(`status:(${query.levels.join(' OR ')})`);
    }

    const response = await this.request<{ data?: DatadogLogEvent[] }>(
      '/api/v2/logs/events/search',
      {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            query: clauses.join(' ') || '*',
            from: new Date(from).toISOString(),
            to: new Date(to).toISOString(),
          },
          page: { limit: Math.min(query.limit ?? 50, MAX_LIMIT) },
          sort: '-timestamp',
        }),
      },
    );

    return (response.data ?? []).map(event => ({
      timestamp: event.attributes?.timestamp ?? new Date(to).toISOString(),
      level: toLogLevel(event.attributes?.status),
      service: event.attributes?.service,
      message: event.attributes?.message ?? '',
      traceId: event.attributes?.attributes?.trace_id as string | undefined,
      attributes: tagsToRecord(event.attributes?.tags),
    }));
  }

  async searchTraces(query: TraceQuery): Promise<TraceSpan[]> {
    const { from, to } = this.resolveWindow(query.since, query.until);

    const clauses: string[] = [];
    if (query.service) clauses.push(`service:${escapeQueryValue(query.service)}`);
    if (query.operation) clauses.push(`operation_name:${escapeQueryValue(query.operation)}`);
    if (query.traceId) clauses.push(`trace_id:${escapeQueryValue(query.traceId)}`);
    if (query.errorOnly) clauses.push('status:error');
    if (query.minDurationMs) {
      clauses.push(`@duration:>${query.minDurationMs * 1_000_000}`);
    }

    const response = await this.request<{ data?: DatadogSpanEvent[] }>(
      '/api/v2/spans/events/search',
      {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'search_request',
            attributes: {
              filter: {
                query: clauses.join(' ') || '*',
                from: new Date(from).toISOString(),
                to: new Date(to).toISOString(),
              },
              page: { limit: Math.min(query.limit ?? 50, MAX_LIMIT) },
              sort: '-timestamp',
            },
          },
        }),
      },
    );

    return (response.data ?? []).map(event => {
      const tags = tagsToRecord(event.attributes?.tags);

      return {
        traceId: event.attributes?.trace_id ?? '',
        spanId: event.attributes?.span_id ?? event.id ?? '',
        parentSpanId: event.attributes?.parent_id,
        operation: event.attributes?.resource_name,
        service: event.attributes?.service,
        startedAt: event.attributes?.start_timestamp,
        // Datadog reports span duration in nanoseconds.
        durationMs:
          event.attributes?.duration !== undefined
            ? event.attributes.duration / 1_000_000
            : undefined,
        error: tags?.status === 'error' || undefined,
        statusMessage: tags?.['error.message'],
      };
    });
  }

  async listDashboards(query: DashboardQuery): Promise<DashboardLink[]> {
    const response = await this.request<{ dashboards?: DatadogDashboard[] }>(
      '/api/v1/dashboard',
      { method: 'GET' },
    );

    const needles = [query.service, query.team, query.text]
      .filter((value): value is string => Boolean(value))
      .map(value => value.toLowerCase());

    // Datadog has no server-side dashboard filter, so matching happens here.
    this.logger.debug(
      `Filtering ${response.dashboards?.length ?? 0} Datadog dashboards against ${needles.length} term(s)`,
    );

    return (response.dashboards ?? [])
      .filter(dashboard => {
        if (!needles.length) return true;
        const haystack = `${dashboard.title ?? ''} ${dashboard.description ?? ''}`.toLowerCase();
        return needles.some(needle => haystack.includes(needle));
      })
      .map(dashboard => ({
        id: dashboard.id ?? '',
        title: dashboard.title ?? '',
        description: dashboard.description ?? undefined,
        url: dashboard.url
          ? `${this.appBaseUrl}${dashboard.url}`
          : `${this.appBaseUrl}/dashboard/${dashboard.id ?? ''}`,
      }));
  }

  /** Queries are always bounded so an agent cannot issue an open-ended request. */
  private resolveWindow(
    since?: string,
    until?: string,
  ): { from: number; to: number } {
    const to = until ? Date.parse(until) : Date.now();
    const from = since ? Date.parse(since) : to - DEFAULT_LOOKBACK_MS;

    if (Number.isNaN(from) || Number.isNaN(to)) {
      throw new Error(
        'Datadog query requires `since` and `until` to be valid ISO-8601 timestamps',
      );
    }

    if (from >= to) {
      throw new Error('Datadog query requires `since` to be earlier than `until`');
    }

    return { from, to };
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchApi(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'DD-API-KEY': this.apiKey,
        'DD-APPLICATION-KEY': this.applicationKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    if (!response.ok) {
      // Response bodies can echo request content, so only the status line is surfaced.
      throw new Error(
        `Datadog request to ${path} failed with ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as T;
  }
}
