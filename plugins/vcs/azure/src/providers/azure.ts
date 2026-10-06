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
import { ScmIntegrations, AzureIntegration } from '@backstage/integration';
import * as azdev from 'azure-devops-node-api';
import { IGitApi } from 'azure-devops-node-api/GitApi';
import { VersionControlRecursionType } from 'azure-devops-node-api/interfaces/GitInterfaces';
import {
  PullRequestSummary,
  RepositoryMetadata,
  RepositorySearchResult,
  VcsDriver,
} from '@ai-crew-suite/plugin-kernel-node';

/**
 * Isolated parameters required to instantiate the concrete Azure DevOps VCS adapter.
 * Managed entirely within the scope of this provider module package.
 */
export type AzureDriverOptions = {
  urlReader: UrlReaderService;
  logger: LoggerService;
  integrations: ScmIntegrations;
};

export class AzureDriver implements VcsDriver {
  readonly providerId = 'azuredevops';
  private readonly urlReader: UrlReaderService;
  private readonly logger: LoggerService;
  private readonly integrations: ScmIntegrations;

  constructor(opts: AzureDriverOptions) {
    this.urlReader = opts.urlReader;
    this.logger = opts.logger;
    this.integrations = opts.integrations;
  }

  private async getClientForRepo(repoUrl: string): Promise<{
    gitApi: IGitApi;
    integration: AzureIntegration;
    org: string;
    project: string;
    repoName: string;
  }> {
    const integration = this.integrations.azure.byUrl(repoUrl);
    if (!integration) {
      throw new Error(`No Azure DevOps integration found configured for URL: ${repoUrl}`);
    }

    let org: string;
    let project: string;
    let repoName: string;
    let orgUrl = '';
    const urlObj = new URL(repoUrl);

    try {
      const host = urlObj.host;
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      // FIXED BUG 1: urlObj.host parses raw domain properties (e.g., 'dev.azure.com'), 
      // never a protocol scheme literal prefix like '://azure.com'.
      if (host === 'dev.azure.com' || host === 'azure.com') {
        if (pathParts.length < 4) throw new Error();
        org = pathParts[0];
        project = pathParts[1];
        repoName = pathParts[3];
      } else if (host.endsWith('.visualstudio.com')) {
        if (pathParts.length < 3) throw new Error();
        org = host.split('.')[0];
        project = pathParts[0];
        repoName = pathParts[2];
      } else {
        if (pathParts.length < 3) throw new Error();
        org = pathParts[0];
        project = pathParts[1];
        repoName = pathParts[pathParts.length - 1];
      }

      repoName = repoName.replace(/\.git$/, '');
      orgUrl = `https://${urlObj.host}/${org}`;
    } catch {
      throw new Error(`AzureDriver could not parse repository URL: ${repoUrl}`);
    }

    const credential = integration.config.credentials?.[0];
    let token = '';

    if (credential && 'personalAccessToken' in credential) {
      token = credential.personalAccessToken ?? '';
    } else if (credential && 'clientSecret' in credential) {
      token = credential.clientSecret ?? '';
    }

    const authHandler = azdev.getPersonalAccessTokenHandler(token);
    const connection = new azdev.WebApi(orgUrl, authHandler);
    const gitApi = await connection.getGitApi();

    return { gitApi, integration, org, project, repoName };
  }


  async getRepositoryMetadata(repoUrl: string): Promise<RepositoryMetadata> {
    const { gitApi, project, repoName } = await this.getClientForRepo(repoUrl);
    const repo = await gitApi.getRepository(repoName, project);

    return {
      owner: project,
      name: repoName,
      defaultBranch: repo.defaultBranch?.replace('refs/heads/', '') ?? 'main',
      provider: this.providerId,
      url: repoUrl,
    };
  }

  async readFile(repoUrl: string, path: string, ref?: string): Promise<string> {
    const integration = this.integrations.azure.byUrl(repoUrl);
    if (!integration) {
      throw new Error(`No Azure DevOps integration found configured for URL: ${repoUrl}`);
    }

    const cleanPath = path.replace(/^\//, '');
    const versionSegment = ref ? `&version=${encodeURIComponent(ref)}` : '';

    const targetUrl = `${repoUrl}?path=${encodeURIComponent(`/${cleanPath}`)}${versionSegment}`;

    this.logger.debug(`AzureDriver reading via UrlReader: ${targetUrl}`);
    const response = await this.urlReader.readUrl(targetUrl);
    const buffer = await response.buffer();
    return buffer.toString('utf8');
  }

  async searchRepository(repoUrl: string, query: string): Promise<RepositorySearchResult[]> {
    const { gitApi, project, repoName } = await this.getClientForRepo(repoUrl);

    this.logger.warn(`Azure Search invoked for ${repoName} with query: ${query}.`);

    const items = await gitApi.getItems(
      repoName,
      project,
      undefined,
      VersionControlRecursionType.Full,
    );

    return items
      .filter(item => item.path && !item.isFolder)
      .map(item => ({
        path: item.path!.replace(/^\//, ''),
        url: `${repoUrl}?path=${encodeURIComponent(item.path!)}`,
      }));
  }

  async listPullRequests(repoUrl: string): Promise<PullRequestSummary[]> {
    const { gitApi, project, repoName } = await this.getClientForRepo(repoUrl);
    const prs = await gitApi.getPullRequests(repoName, { status: 1 }, project);

    return prs.map(pr => {
      const headBranch = pr.sourceRefName?.replace('refs/heads/', '') ?? '';
      const baseBranch = pr.targetRefName?.replace('refs/heads/', '') ?? '';

      return {
        number: String(pr.pullRequestId),
        title: pr.title ?? '',
        headBranch,
        baseBranch,
        state: 'open' as const,
        url: `${repoUrl}/pullrequest/${pr.pullRequestId}`,
        author: pr.createdBy?.displayName,
      };
    });
  }
}
