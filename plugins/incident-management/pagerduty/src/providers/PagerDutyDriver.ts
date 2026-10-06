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
  AlertHistoryEntry,
  AlertHistoryQuery,
  IncidentDetail,
  IncidentManagementDriver,
  IncidentNote,
  IncidentResolutionKind,
  IncidentSearchQuery,
  IncidentState,
  IncidentSummary,
  OnCallQuery,
  OnCallShift,
  ServiceActor,
} from '@ai-crew-suite/plugin-kernel-node';

/**
 * Connection settings for the PagerDuty incident management driver.
 */
export type PagerDutyDriverConfig = {
  /** PagerDuty REST API key. */
  apiToken: string;
  /** REST API base URL. Defaults to `https://api.pagerduty.com`. */
  apiBaseUrl?: string;
  /**
   * Email of a valid PagerDuty user, sent as the `From` header. PagerDuty
   * requires this to attribute write operations such as incident notes.
   */
  fromEmail?: string;
};

export interface PagerDutyDriverOptions {
  logger: LoggerService;
  config: PagerDutyDriverConfig;
  /** Injectable fetch implementation, primarily for tests. */
  fetchApi?: typeof fetch;
}

const DEFAULT_API_BASE_URL = 'https://api.pagerduty.com';
const MAX_LIMIT = 100;

type PagerDutyReference = {
  id?: string;
  type?: string;
  summary?: string;
  html_url?: string;
};

type PagerDutyIncident = {
  id: string;
  incident_number?: number;
  title?: string;
  description?: string;
  status?: 'triggered' | 'acknowledged' | 'resolved';
  urgency?: 'high' | 'low';
  created_at?: string;
  resolved_at?: string;
  html_url?: string;
  incident_key?: string;
  service?: PagerDutyReference;
  priority?: PagerDutyReference;
  escalation_policy?: PagerDutyReference;
  teams?: PagerDutyReference[];
  assignments?: { assignee?: PagerDutyReference }[];
  acknowledgements?: { at?: string; acknowledger?: PagerDutyReference }[];
  last_status_change_by?: PagerDutyReference;
};

type PagerDutyNote = {
  id?: string;
  content?: string;
  created_at?: string;
  user?: PagerDutyReference;
};

type PagerDutyOnCall = {
  user?: PagerDutyReference & { email?: string };
  escalation_policy?: PagerDutyReference;
  schedule?: PagerDutyReference | null;
  escalation_level?: number;
  start?: string | null;
  end?: string | null;
};

type PagerDutyService = {
  id: string;
  name?: string;
  escalation_policy?: PagerDutyReference;
};

const STATE_TO_STATUS: Record<IncidentState, string> = {
  triggered: 'triggered',
  acknowledged: 'acknowledged',
  resolved: 'resolved',
};

const toIncidentState = (status?: string): IncidentState => {
  switch (status) {
    case 'acknowledged':
      return 'acknowledged';
    case 'resolved':
      return 'resolved';
    default:
      return 'triggered';
  }
};

const toActor = (
  reference?: (PagerDutyReference & { email?: string }) | null,
): ServiceActor | undefined =>
  reference?.id
    ? {
        id: reference.id,
        displayName: reference.summary,
        email: reference.email,
      }
    : undefined;

/**
 * PagerDuty attributes the final status change to the agent that made it, so a
 * user agent means a responder resolved the incident and a service or
 * integration agent means it self-resolved.
 */
const toResolutionKind = (
  incident: PagerDutyIncident,
): IncidentResolutionKind => {
  if (incident.status !== 'resolved') return 'unresolved';
  return incident.last_status_change_by?.type?.startsWith('user')
    ? 'manual'
    : 'auto';
};

/**
 * PagerDuty implementation of the provider-neutral incident management driver.
 */
export class PagerDutyDriver implements IncidentManagementDriver {
  readonly providerId = 'pagerduty';

  private readonly logger: LoggerService;
  private readonly apiBaseUrl: string;
  private readonly apiToken: string;
  private readonly fromEmail?: string;
  private readonly fetchApi: typeof fetch;

  constructor(options: PagerDutyDriverOptions) {
    const { logger, config, fetchApi } = options;
    this.logger = logger;
    this.apiToken = config.apiToken;
    this.apiBaseUrl = (config.apiBaseUrl ?? DEFAULT_API_BASE_URL).replace(/\/+$/, '');
    this.fromEmail = config.fromEmail;
    this.fetchApi = fetchApi ?? fetch;
  }

  async listIncidents(query: IncidentSearchQuery): Promise<IncidentSummary[]> {
    const params = await this.buildIncidentParams(query);

    const response = await this.get<{ incidents?: PagerDutyIncident[] }>(
      '/incidents',
      params,
    );

    return (response.incidents ?? []).map(incident => this.toSummary(incident));
  }

  async getIncident(incidentId: string): Promise<IncidentDetail> {
    const encoded = encodeURIComponent(incidentId);

    const [incidentResponse, notesResponse] = await Promise.all([
      this.get<{ incident: PagerDutyIncident }>(`/incidents/${encoded}`, {}),
      this.get<{ notes?: PagerDutyNote[] }>(`/incidents/${encoded}/notes`, {}),
    ]);

    return {
      ...this.toSummary(incidentResponse.incident),
      description: incidentResponse.incident.description,
      notes: (notesResponse.notes ?? []).map(note => this.toNote(note)),
    };
  }

  async getOnCallShifts(query: OnCallQuery): Promise<OnCallShift[]> {
    const policyIds = await this.resolveEscalationPolicyIds(query);

    // A service or team filter that matches no policy must not silently widen
    // the query to the whole account.
    if ((query.service || query.team || query.policyId) && !policyIds.length) {
      return [];
    }

    const params: Record<string, string[]> = {
      'include[]': ['users', 'escalation_policies'],
    };
    if (policyIds.length) params['escalation_policy_ids[]'] = policyIds;
    if (query.at) {
      params['since'] = [query.at];
      params['until'] = [query.at];
    }

    const response = await this.get<{ oncalls?: PagerDutyOnCall[] }>(
      '/oncalls',
      params,
    );

    return (response.oncalls ?? []).flatMap(oncall => {
      const responder = toActor(oncall.user);
      if (!responder) return [];

      return [
        {
          responder,
          policyId: oncall.escalation_policy?.id,
          policyName: oncall.escalation_policy?.summary,
          escalationLevel: oncall.escalation_level,
          start: oncall.start ?? undefined,
          end: oncall.end ?? undefined,
        },
      ];
    });
  }

  async getAlertHistory(query: AlertHistoryQuery): Promise<AlertHistoryEntry[]> {
    const params = await this.buildIncidentParams({
      service: query.service,
      team: query.team,
      since: query.since,
      until: query.until,
      limit: query.limit,
    });

    const response = await this.get<{ incidents?: PagerDutyIncident[] }>(
      '/incidents',
      params,
    );

    return (response.incidents ?? [])
      .filter(incident => !query.alertId || incident.incident_key === query.alertId)
      .map(incident => ({
        id: incident.id,
        alertId: incident.incident_key,
        title: incident.title ?? '',
        severity: incident.priority?.summary ?? incident.urgency,
        service: incident.service?.summary,
        triggeredAt: incident.created_at,
        resolvedAt: incident.resolved_at ?? undefined,
        resolution: toResolutionKind(incident),
        paged: incident.urgency === 'high',
      }));
  }

  async annotateIncident(
    incidentId: string,
    note: string,
  ): Promise<IncidentNote> {
    if (!this.fromEmail) {
      throw new Error(
        'PagerDuty note creation requires ai.integrations.incidentManagement.pagerduty.fromEmail to be set',
      );
    }

    const response = await this.request<{ note: PagerDutyNote }>(
      `/incidents/${encodeURIComponent(incidentId)}/notes`,
      {
        method: 'POST',
        headers: { From: this.fromEmail },
        body: JSON.stringify({ note: { content: note } }),
      },
    );

    this.logger.info(`Annotated PagerDuty incident ${incidentId}`);

    return this.toNote(response.note);
  }

  private async buildIncidentParams(
    query: IncidentSearchQuery,
  ): Promise<Record<string, string[]>> {
    const params: Record<string, string[]> = {
      limit: [String(Math.min(query.limit ?? 25, MAX_LIMIT))],
      'sort_by[]': ['created_at:desc'],
    };

    if (query['since']) params['since'] = [query.since];
    if (query['until']) params['until'] = [query.until];
    if (query.states?.length) {
      params['statuses[]'] = query.states.map(state => STATE_TO_STATUS[state]);
    }
    if (query.team) params['team_ids[]'] = [query.team];
    if (query.service) {
      const serviceIds = await this.resolveServiceIds(query.service);
      // Passing no IDs would drop the filter entirely and return every incident.
      params['service_ids[]'] = serviceIds.length ? serviceIds : ['__no_match__'];
    }

    return params;
  }

  private async resolveServiceIds(service: string): Promise<string[]> {
    const response = await this.get<{ services?: PagerDutyService[] }>(
      '/services',
      { query: [service], limit: [String(MAX_LIMIT)] },
    );

    return (response.services ?? []).map(candidate => candidate.id);
  }

  private async resolveEscalationPolicyIds(
    query: OnCallQuery,
  ): Promise<string[]> {
    if (query.policyId) return [query.policyId];

    if (query.service) {
      const response = await this.get<{ services?: PagerDutyService[] }>(
        '/services',
        { query: [query.service], limit: [String(MAX_LIMIT)] },
      );

      return (response.services ?? [])
        .map(candidate => candidate.escalation_policy?.id)
        .filter((id): id is string => Boolean(id));
    }

    if (query.team) {
      const response = await this.get<{
        escalation_policies?: PagerDutyReference[];
      }>('/escalation_policies', {
        'team_ids[]': [query.team],
        limit: [String(MAX_LIMIT)],
      });

      return (response.escalation_policies ?? [])
        .map(policy => policy.id)
        .filter((id): id is string => Boolean(id));
    }

    return [];
  }

  private toSummary(incident: PagerDutyIncident): IncidentSummary {
    return {
      id: incident.id,
      title: incident.title ?? '',
      state: toIncidentState(incident.status),
      status: incident.status,
      severity: incident.priority?.summary ?? incident.urgency,
      service: incident.service?.summary,
      team: incident.teams?.[0]?.summary ?? incident.escalation_policy?.summary,
      assignees: (incident.assignments ?? [])
        .map(assignment => toActor(assignment.assignee))
        .filter((actor): actor is ServiceActor => Boolean(actor)),
      url: incident.html_url,
      triggeredAt: incident.created_at,
      acknowledgedAt: incident.acknowledgements?.[0]?.at,
      resolvedAt: incident.resolved_at ?? undefined,
    };
  }

  private toNote(note: PagerDutyNote): IncidentNote {
    return {
      id: note.id,
      author: toActor(note.user) ?? { id: 'unknown' },
      body: note.content ?? '',
      createdAt: note.created_at,
    };
  }

  private async get<T>(
    path: string,
    params: Record<string, string[]>,
  ): Promise<T> {
    const search = new URLSearchParams();
    for (const [key, values] of Object.entries(params)) {
      for (const value of values) search.append(key, value);
    }

    const query = search.toString();
    return this.request<T>(query ? `${path}?${query}` : path, { method: 'GET' });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await this.fetchApi(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Token token=${this.apiToken}`,
        Accept: 'application/vnd.pagerduty+json;version=2',
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    if (!response.ok) {
      // Response bodies can echo request content, so only the status line is surfaced.
      throw new Error(
        `PagerDuty request to ${path} failed with ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as T;
  }
}
