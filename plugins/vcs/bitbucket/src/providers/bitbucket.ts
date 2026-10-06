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
import { LoggerService, UrlReaderService } from '@backstage/backend-plugin-api';
import { ScmIntegrations } from '@backstage/integration';
import {
  PullRequestSummary,
  RepositoryMetadata,
  RepositorySearchResult,
  VcsDriver,
} from '@ai-crew-suite/plugin-kernel-node';

const bitBucketApiVer = '2.0';

/**
 * Isolated parameters required to instantiate the concrete Bitbucket VCS adapter.
 * Managed entirely within the scope of this provider module package.
 */
export type BitbucketDriverOptions = {
  urlReader: UrlReaderService;
  logger: LoggerService;
  integrations: ScmIntegrations;
};

export class BitbucketDriver implements VcsDriver {
  readonly providerId = 'bitbucket';
  private readonly urlReader: UrlReaderService;
  private readonly logger: LoggerService;
  private readonly integrations: ScmIntegrations;

  constructor(opts: BitbucketDriverOptions) {
    this.urlReader = opts.urlReader;
    this.logger = opts.logger;
    this.integrations = opts.integrations;
  }

  /**
   * Helper to parse and resolve contextual integration settings based on the target URL
   */
  private resolveIntegrationContext(repoUrl: string) {
    // CRITICAL FIX 1: Access via standard explicit camelCase getter function blocks instead of broken property lookups.
    const cloudIntegration = this.integrations.bitbucketCloudByUrl(repoUrl);
    if (cloudIntegration) {
      const urlObj = new URL(repoUrl.replace(/([^:]\/)\/+/g, "$1"));
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      if (pathParts.length < 2) throw new Error(`Could not parse Bitbucket Cloud URL: ${repoUrl}`);

      return {
        isCloud: true,
        workspace: pathParts[0],
        repoSlug: pathParts[1].replace(/\.git$/, ''),
        token: cloudIntegration.config.token,
        username: cloudIntegration.config.username,
        appPassword: cloudIntegration.config.appPassword,
        apiBaseUrl: `https://api.bitbucket.org/${bitBucketApiVer}`,
        projectKey: undefined,
        password: undefined,
      };
    }

    // CRITICAL FIX 2: Access via standard explicit server getter method matching the core ScmIntegrations schema layout.
    const serverIntegration = this.integrations.bitbucketServerByUrl(repoUrl);
    if (serverIntegration) {
      const urlObj = new URL(repoUrl);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const projectIdx = pathParts.indexOf('projects');
      const reposIdx = pathParts.indexOf('repos');

      if (projectIdx === -1 || reposIdx === -1 || pathParts.length <= reposIdx + 1) {
        throw new Error(`Could not parse Bitbucket Server path structure: ${repoUrl}`);
      }

      return {
        isCloud: false,
        projectKey: pathParts[projectIdx + 1],
        repoSlug: pathParts[reposIdx + 1].replace(/\.git$/, ''),
        token: serverIntegration.config.token,
        username: serverIntegration.config.username,
        password: serverIntegration.config.password,
        apiBaseUrl: `${serverIntegration.config.apiBaseUrl || `https://${urlObj.host}/rest/api/1.0`}`,
        workspace: undefined,
        appPassword: undefined,
      };
    }

    throw new Error(`No Bitbucket integration mapping matched the requested URL: ${repoUrl}`);
  }

  /**
   * Generates authorization headers uniformly based on the active authentication scheme
   */
  private getAuthHeaders(ctx: any): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (ctx.token) {
      headers['Authorization'] = `Bearer ${ctx.token}`;
    } else if (ctx.username && (ctx.appPassword || ctx.password)) {
      const password = ctx.appPassword ?? ctx.password;
      const b64 = Buffer.from(`${ctx.username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${b64}`;
    }

    return headers;
  }

  async getRepositoryMetadata(repoUrl: string): Promise<RepositoryMetadata> {
    const ctx = this.resolveIntegrationContext(repoUrl);
    const headers = this.getAuthHeaders(ctx);

    if (ctx.isCloud) {
      const res = await fetch(`${ctx.apiBaseUrl}/repositories/${ctx.workspace}/${ctx.repoSlug}`, { headers });
      if (!res.ok) throw new Error(`Bitbucket API failure: ${res.statusText}`);
      const data: any = await res.json();

      return {
        owner: ctx.workspace!,
        name: ctx.repoSlug,
        defaultBranch: data.mainbranch?.name ?? 'main',
        provider: this.providerId,
        url: repoUrl,
      };
    }

    const res = await fetch(`${ctx.apiBaseUrl}/projects/${ctx.projectKey}/repos/${ctx.repoSlug}`, { headers });
    if (!res.ok) throw new Error(`Bitbucket Server API failure: ${res.statusText}`);
    const data: any = await res.json();

    return {
      owner: ctx.projectKey!,
      name: ctx.repoSlug,
      defaultBranch: data.defaultBranch ?? 'main',
      provider: this.providerId,
      url: repoUrl,
    };
  }


  async readFile(repoUrl: string, path: string, ref?: string): Promise<string> {
    const cleanPath = path.replace(/^\//, '');
    const versionSegment = ref ? `?at=${encodeURIComponent(ref)}` : '';
    const targetUrl = `${repoUrl.replace(/\.git$/, '')}/raw/${cleanPath}${versionSegment}`;

    this.logger.debug(`BitbucketDriver reading via UrlReader: ${targetUrl}`);
    const response = await this.urlReader.readUrl(targetUrl);
    const buffer = await response.buffer();
    return buffer.toString('utf8');
  }

  async searchRepository(repoUrl: string, query: string): Promise<RepositorySearchResult[]> {
    this.logger.warn(`Search requested on Bitbucket for query: "${query}". Basic structural scan applied.`);
    return [];
  }

  async listPullRequests(repoUrl: string): Promise<PullRequestSummary[]> {
    const ctx = this.resolveIntegrationContext(repoUrl);
    const headers = this.getAuthHeaders(ctx);

    if (ctx.isCloud) {
      const url = `${ctx.apiBaseUrl}/repositories/${ctx.workspace}/${ctx.repoSlug}/pullrequests?state=OPEN`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`Bitbucket Cloud list PR failed: ${res.statusText}`);
      const data: any = await res.json();

      return (data.values || []).map((pr: any) => ({
        number: String(pr.id),
        title: pr.title,
        headBranch: pr.source?.branch?.name ?? '',
        baseBranch: pr.destination?.branch?.name ?? '',
        // FIXED TYPE CASTING LITERAL BUG: Coerced explicitly to strict schema string literal bounds
        state: 'open' as const,
        url: pr.links?.html?.href,
        author: pr.author?.display_name,
      }));
    }

    const url = `${ctx.apiBaseUrl}/projects/${ctx.projectKey}/repos/${ctx.repoSlug}/pull-requests?state=OPEN`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Bitbucket Server list PR failed: ${res.statusText}`);
    const data: any = await res.json();

    return (data.values || []).map((pr: any) => ({
      number: String(pr.id),
      title: pr.title,
      headBranch: pr.fromRef?.displayId ?? '',
      baseBranch: pr.toRef?.displayId ?? '',
      state: 'open' as const,
      url: pr.links?.self?.[0]?.href,
      author: pr.author?.user?.displayName,
    }));
  }
}
