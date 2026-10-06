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
import gitUrlParse from 'git-url-parse';
import {
  VcsDriver,
  RepositoryMetadata,
  RepositorySearchResult,
  PullRequestSummary
} from '@ai-crew-suite/plugin-kernel-node';

/**
 * Isolated parameters required to instantiate the concrete Generic Git VCS adapter.
 * Managed entirely within the scope of this provider module package.
 */
export type GenericGitDriverOptions = {
  urlReader: UrlReaderService;
  logger: LoggerService;
  integrations: ScmIntegrations;
};

export class GenericGitDriver implements VcsDriver {
  readonly providerId = 'git';
  private readonly urlReader: UrlReaderService;
  private readonly logger: LoggerService;
  private readonly integrations: ScmIntegrations;

  constructor(opts: GenericGitDriverOptions) {
    this.urlReader = opts.urlReader;
    this.logger = opts.logger;
    this.integrations = opts.integrations;
  }

  /**
   * Parses a raw git URL into its host, owner, and repository name segments.
   *
   * Delegates to `git-url-parse` for robust handling of HTTPS, SSH, and SCP-style
   * git URLs. Falls back to safe defaults when the URL cannot be parsed.
   */
  private parseGitUrl(repoUrl: string): { host: string; owner: string; name: string } {
    try {
      const parsed = gitUrlParse(repoUrl);
      return {
        host: parsed.source || parsed.host,
        owner: parsed.owner || 'generic',
        name: parsed.name || 'repository',
      };
    } catch (error: any) {
      this.logger.warn(`Fallback parser matching failed for ${repoUrl}: ${error.message}`);
      return { host: 'github.com', owner: 'generic', name: 'repository' };
    }
  }

  async getRepositoryMetadata(repoUrl: string): Promise<RepositoryMetadata> {
    const { owner, name } = this.parseGitUrl(repoUrl);

    return {
      owner,
      name,
      defaultBranch: 'HEAD',
      provider: this.providerId,
      url: repoUrl,
    };
  }

  async readFile(repoUrl: string, path: string, ref?: string): Promise<string> {
    const { host, owner, name } = this.parseGitUrl(repoUrl);
    const cleanPath = path.replace(/^\//, '');
    const targetUrl = `https://${host}/${owner}/${name}/blob/${ref ?? 'HEAD'}/${cleanPath}`;

    this.logger.debug(`GenericGitDriver forwarding file read string to UrlReader: ${targetUrl}`);
    const response = await this.urlReader.readUrl(targetUrl);
    const buffer = await response.buffer();
    return buffer.toString('utf8');
  }

  async searchRepository(_repoUrl: string, query: string): Promise<RepositorySearchResult[]> {
    this.logger.warn(`Search requested on Generic Git Driver for query "${query}". Unhandled provider action.`);
    return [];
  }

  async listPullRequests(repoUrl: string): Promise<PullRequestSummary[]> {
    this.logger.warn(`Pull requests query invoked on a Generic Git target: ${repoUrl}. Action bypassed.`);
    return [];
  }
}

