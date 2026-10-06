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
import { ScmIntegrations, GerritIntegration } from '@backstage/integration';
import {
  VcsDriver,
  RepositoryMetadata,
  RepositorySearchResult,
  PullRequestSummary,
} from '@ai-crew-suite/plugin-kernel-node';

/**
 * Isolated parameters required to instantiate the concrete Gerrit VCS adapter.
 * Managed entirely within the scope of this provider module package.
 */
export type GerritDriverOptions = {
  urlReader: UrlReaderService;
  logger: LoggerService;
  integrations: ScmIntegrations;
};

export class GerritDriver implements VcsDriver {
  readonly providerId = 'gerrit';
  private readonly urlReader: UrlReaderService;
  private readonly logger: LoggerService;
  private readonly integrations: ScmIntegrations;

  constructor(opts: GerritDriverOptions) {
    this.urlReader = opts.urlReader;
    this.logger = opts.logger;
    this.integrations = opts.integrations;
  }

  /**
   * Helper to parse and resolve contextual integration settings based on the target URL
   */
  private resolveIntegrationContext(repoUrl: string) {
    const integration = this.integrations.gerritByUrl(repoUrl);
    if (!integration) {
      throw new Error(`No Gerrit integration found configured for URL: ${repoUrl}`);
    }

    let projectKey = '';
    try {
      const urlObj = new URL(repoUrl);
      // Strip out leading authentication prefixes like '/a/' or '/p/'
      const cleanPath = urlObj.pathname.replace(/^\/(a|p)\//i, '/').replace(/^\/|\/$/g, '');
      projectKey = cleanPath.replace(/\.git$/, '');

      if (!projectKey) throw new Error();
    } catch {
      throw new Error(`GerritDriver could not parse project structure from URL: ${repoUrl}`);
    }

    return {
      integration,
      projectKey,
      baseUrl: integration.config.baseUrl,
      token: integration.config.password, // Gerrit credentials store HTTP password tokens
      username: integration.config.username,
    };
  }

  /**
   * Cleans Gerrit's anti-XSS magic security prefix )]}'\n from response streams
   */
  private async parseGerritJson(response: Response): Promise<any> {
    const rawText = await response.text();
    const cleanText = rawText.replace(/^\)]}'\n/, '');
    return JSON.parse(cleanText);
  }

  private getAuthHeaders(ctx: ReturnType<typeof this.resolveIntegrationContext>): Record<string, string> {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (ctx.username && ctx.token) {
      const b64 = Buffer.from(`${ctx.username}:${ctx.token}`).toString('base64');
      headers['Authorization'] = `Basic ${b64}`;
    }
    return headers;
  }

  async getRepositoryMetadata(repoUrl: string): Promise<RepositoryMetadata> {
    const ctx = this.resolveIntegrationContext(repoUrl);
    const headers = this.getAuthHeaders(ctx);

    // URL encode project paths as expected by Gerrit namespaces
    const encodedProject = encodeURIComponent(ctx.projectKey);
    const res = await fetch(`${ctx.baseUrl}/a/projects/${encodedProject}`, { headers });

    if (!res.ok) {
      throw new Error(`Gerrit project metadata lookup failed: ${res.statusText}`);
    }

    const data = await this.parseGerritJson(res);

    return {
      owner: ctx.projectKey.split('/').shift() ?? 'gerrit',
      name: ctx.projectKey.split('/').pop() ?? ctx.projectKey,
      defaultBranch: data.branches?.[0] ?? 'master', // Gerrit historically maps to master branches
      provider: this.providerId,
      url: repoUrl,
    };
  }

  async readFile(repoUrl: string, path: string, ref?: string): Promise<string> {
    const ctx = this.resolveIntegrationContext(repoUrl);
    const cleanPath = path.replace(/^\//, '');
    const targetRef = ref ?? 'HEAD';

    // Route request directly via Gerrit's REST API endpoint file-content endpoint
    const encodedProject = encodeURIComponent(ctx.projectKey);
    const encodedFile = encodeURIComponent(cleanPath);
    const targetUrl = `${ctx.baseUrl}/a/projects/${encodedProject}/branches/${targetRef}/files/${encodedFile}/content`;

    this.logger.debug(`GerritDriver reading path file data from endpoint: ${targetUrl}`);
    const res = await fetch(targetUrl, { headers: this.getAuthHeaders(ctx) });
    
    if (!res.ok) {
      throw new Error(`Gerrit file read failed for ${cleanPath}: ${res.statusText}`);
    }

    // Gerrit handles file contents encoded via base64 arrays natively
    const b64Content = await res.text();
    return Buffer.from(b64Content, 'base64').toString('utf8');
  }

  async searchRepository(_repoUrl: string, query: string): Promise<RepositorySearchResult[]> {
    this.logger.warn(`Search requested on Gerrit for query: "${query}". Fallback array returned.`);
    return [];
  }

  async listPullRequests(repoUrl: string): Promise<PullRequestSummary[]> {
    const ctx = this.resolveIntegrationContext(repoUrl);
    const headers = this.getAuthHeaders(ctx);

    // Map open changes belonging strictly to this project scope configuration
    const query = encodeURIComponent(`project:${ctx.projectKey} status:open`);
    const res = await fetch(`${ctx.baseUrl}/a/changes/?q=${query}&o=CURRENT_REVISION`, { headers });

    if (!res.ok) {
      throw new Error(`Gerrit changes list query failed: ${res.statusText}`);
    }

    const changes = await this.parseGerritJson(res);

    return (changes || []).map((change: any) => {
      // Extract branch values natively mapped within Gerrit structural parameters
      return {
        number: String(change._number),
        title: change.subject ?? '',
        headBranch: `refs/changes/${String(change._number).slice(-2)}/${change._number}/${change.current_revision ? 'patch' : '1'}`,
        baseBranch: change.branch ?? 'master',
        state: 'open' as const,
        url: `${ctx.baseUrl}/c/${ctx.projectKey}/+/${change._number}`,
        author: change.owner?.username ?? change.owner?.name,
      };
    });
  }
}
