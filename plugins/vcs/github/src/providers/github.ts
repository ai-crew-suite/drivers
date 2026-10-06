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
import { ScmIntegrations, GithubCredentialsProvider, GithubIntegration } from '@backstage/integration';
import { Octokit } from '@octokit/rest';
import {
  PullRequestSummary,
  RepositoryMetadata,
  RepositorySearchResult,
  VcsDriver,
} from '@ai-crew-suite/plugin-kernel-node';

/**
 * Isolated parameters required to instantiate the concrete GitHub VCS adapter.
 * Managed entirely within the scope of this provider module package.
 */
export type GitHubDriverOptions = {
  urlReader: UrlReaderService;
  logger: LoggerService;
  integrations: ScmIntegrations;
  credentialsProvider: GithubCredentialsProvider;
};

export class GitHubDriver implements VcsDriver {
  readonly providerId = 'github';
  private readonly urlReader: UrlReaderService;
  private readonly logger: LoggerService;
  private readonly integrations: ScmIntegrations;
  private readonly credentialsProvider: GithubCredentialsProvider;

  constructor(opts: GitHubDriverOptions) {
    this.urlReader = opts.urlReader;
    this.logger = opts.logger;
    this.integrations = opts.integrations;
    this.credentialsProvider = opts.credentialsProvider;
  }

  private async getClientForRepo(repoUrl: string): Promise<{ octokit: Octokit; integration: GithubIntegration; owner: string; repo: string }> {
    const integration = this.integrations.github.byUrl(repoUrl);
    if (!integration) {
      throw new Error(`No GitHub integration found configured for URL: ${repoUrl}`);
    }

    let owner: string;
    let repo: string;

    try {
      const urlObj = new URL(repoUrl);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      if (pathParts.length < 2) {
        throw new Error();
      }

      owner = pathParts[0];
      repo = pathParts[1].replace(/\.git$/, '');
    } catch {
      throw new Error(`GitHubDriver could not parse repository URL: ${repoUrl}`);
    }

    const { token } = await this.credentialsProvider.getCredentials({
      url: repoUrl,
    });

    const octokit = new Octokit({
      auth: token,
      baseUrl: integration.config.apiBaseUrl,
    });

    return { octokit, integration, owner, repo };
  }

  async getRepositoryMetadata(repoUrl: string): Promise<RepositoryMetadata> {
    const { octokit, owner, repo } = await this.getClientForRepo(repoUrl);
    const { data } = await octokit.repos.get({ owner, repo });

    return {
      owner,
      name: repo,
      defaultBranch: data.default_branch ?? 'main',
      provider: this.providerId,
      url: repoUrl,
    };
  }

  async readFile(repoUrl: string, path: string, ref?: string): Promise<string> {
    const integration = this.integrations.github.byUrl(repoUrl);
    if (!integration) {
      throw new Error(`No GitHub integration found configured for URL: ${repoUrl}`);
    }

    let owner: string;
    let repo: string;

    try {
      const urlObj = new URL(repoUrl);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length < 2) throw new Error();
      // Fixed lines 68-69: Restored precise explicit index array accessor positions
      owner = pathParts[0];
      repo = pathParts[1].replace(/\.git$/, '');
    } catch {
      throw new Error(`GitHubDriver could not parse repository URL: ${repoUrl}`);
    }

    const cleanPath = path.replace(/^\//, '');
    const host = integration.config.host ?? 'github.com';
    const targetUrl = `https://${host}/${owner}/${repo}/blob/${ref ?? 'HEAD'}/${cleanPath}`;

    this.logger.debug(`GitHubDriver reading via UrlReader: ${targetUrl}`);
    const response = await this.urlReader.readUrl(targetUrl);
    const buffer = await response.buffer();
    return buffer.toString('utf8');
  }

  async searchRepository(repoUrl: string, query: string): Promise<RepositorySearchResult[]> {
    const { octokit, owner, repo } = await this.getClientForRepo(repoUrl);
    const q = `${query} repo:${owner}/${repo}`;
    const { data } = await octokit.search.code({ q });

    return data.items.map(item => ({
      path: item.path,
    }));
  }

  async listPullRequests(repoUrl: string): Promise<PullRequestSummary[]> {
    const { octokit, owner, repo } = await this.getClientForRepo(repoUrl);
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: 'open',
      per_page: 20,
    });

    return data.map(pr => {
      let mappedState: 'open' | 'closed' | 'merged' = 'open';
      if (pr.state === 'closed') {
        mappedState = pr.merged_at ? 'merged' : 'closed';
      }

      return {
        number: pr.number,
        title: pr.title,
        headBranch: pr.head.ref,
        baseBranch: pr.base.ref,
        state: mappedState,
        url: pr.html_url,
        author: pr.user?.login,
      };
    });
  }
}
