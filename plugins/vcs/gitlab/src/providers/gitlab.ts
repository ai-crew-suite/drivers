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
import { ScmIntegrations, GitLabIntegration } from '@backstage/integration';
import { Gitlab } from '@gitbeaker/rest';
import {
  PullRequestSummary,
  RepositoryMetadata,
  RepositorySearchResult,
  VcsDriver,
} from '@ai-crew-suite/plugin-kernel-node';

/**
 * Isolated parameters required to instantiate the concrete GitLab VCS adapter.
 * Managed entirely within the scope of this provider module package.
 */
export type GitLabDriverOptions = {
  urlReader: UrlReaderService;
  logger: LoggerService;
  integrations: ScmIntegrations;
};

export class GitLabDriver implements VcsDriver {
  readonly providerId = 'gitlab';
  private readonly urlReader: UrlReaderService;
  private readonly logger: LoggerService;
  private readonly integrations: ScmIntegrations;

  constructor(opts: GitLabDriverOptions) {
    this.urlReader = opts.urlReader;
    this.logger = opts.logger;
    this.integrations = opts.integrations;
  }

  /**
   * Helper to resolve the correct configured integration and authenticated GitBeaker API client
   */
  private async getClientForRepo(repoUrl: string): Promise<{ api: InstanceType<typeof Gitlab>; integration: GitLabIntegration; projectPath: string }> {
    const integration = this.integrations.gitlabByUrl(repoUrl);
    if (!integration) {
      throw new Error(`No GitLab integration found configured for URL: ${repoUrl}`);
    }

    let projectPath = '';
    try {
      const urlObj = new URL(repoUrl);
      projectPath = urlObj.pathname.replace(/^\/|\/$/g, '').replace(/\.git$/, '');

      if (!projectPath || projectPath.split('/').length < 2) {
        throw new Error();
      }
    } catch {
      throw new Error(`GitLabDriver could not parse repository URL: ${repoUrl}`);
    }

    const token = integration.config.token ?? '';

    const api = new Gitlab({
      host: integration.config.baseUrl,
      token,
    });

    return { api, integration, projectPath };
  }

  async getRepositoryMetadata(repoUrl: string): Promise<RepositoryMetadata> {
    const { api, projectPath } = await this.getClientForRepo(repoUrl);
    const project = await api.Projects.show(projectPath);

    return {
      owner: project.namespace.fullPath as string,
      name: project.name as string,
      defaultBranch: (project.defaultBranch as string) ?? 'main',
      provider: this.providerId,
      url: repoUrl,
    };
  }

  async readFile(repoUrl: string, path: string, ref?: string): Promise<string> {
    const { integration, projectPath } = await this.getClientForRepo(repoUrl);

    const cleanPath = path.replace(/^\//, '');
    const host = integration.config.host ?? 'gitlab.com';
    const targetUrl = `https://${host}/${projectPath}/blob/${ref ?? 'HEAD'}/${cleanPath}`;

    this.logger.debug(`GitLabDriver reading via UrlReader: ${targetUrl}`);
    const response = await this.urlReader.readUrl(targetUrl);
    const buffer = await response.buffer();
    return buffer.toString('utf8');
  }


  async searchRepository(repoUrl: string, query: string): Promise<RepositorySearchResult[]> {
    const { api, projectPath } = await this.getClientForRepo(repoUrl);
    this.logger.debug(`GitLab Search invoked for ${projectPath} with query: ${query}`);

    const blobs = await api.Search.all('blobs', query, { projectId: projectPath });

    return blobs.map((blob: any) => ({
      path: blob.filename,
      url: `${repoUrl}/-/blob/${blob.ref ?? 'main'}/${blob.filename}`,
    }));
  }

  async listPullRequests(repoUrl: string): Promise<PullRequestSummary[]> {
    const { api, projectPath } = await this.getClientForRepo(repoUrl);

    const mergeRequests = await api.MergeRequests.all({
      projectId: projectPath,
      state: 'opened',
      perPage: 20,
    });

    return mergeRequests.map((mr: any) => ({
      number: mr.iid,
      title: mr.title,
      headBranch: mr.source_branch,
      baseBranch: mr.target_branch,
      state: 'open' as const,
      url: mr.web_url,
      author: mr.author?.username,
    }));
  }
}
