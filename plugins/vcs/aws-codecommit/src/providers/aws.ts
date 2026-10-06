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
import {
  CodeCommitClient,
  GetRepositoryCommand,
  GetFileCommand,
  ListPullRequestsCommand,
  GetPullRequestCommand
} from '@aws-sdk/client-codecommit';
import { LoggerService, UrlReaderService } from '@backstage/backend-plugin-api';
import { ScmIntegrations } from '@backstage/integration';
import {
  VcsDriver,
  RepositoryMetadata,
  RepositorySearchResult,
  PullRequestSummary
} from '@ai-crew-suite/plugin-kernel-node';

/**
 * Isolated parameters required to instantiate the concrete AWS CodeCommit VCS adapter.
 * Managed entirely within the scope of this provider module package.
 */
export type AwsCodeCommitDriverOptions = {
  urlReader: UrlReaderService;
  logger: LoggerService;
  integrations: ScmIntegrations;
};

export class AwsCodeCommitDriver implements VcsDriver {
  readonly providerId = 'aws-codecommit';
  private readonly urlReader: UrlReaderService;
  private readonly logger: LoggerService;
  private readonly integrations: ScmIntegrations;

  constructor(opts: AwsCodeCommitDriverOptions) {
    this.urlReader = opts.urlReader;
    this.logger = opts.logger;
    this.integrations = opts.integrations;
  }

  /**
   * Helper to resolve the correct integration and configure the native AWS CodeCommit SDK client
   */
  private getClientForRepo(repoUrl: string): { client: CodeCommitClient; repoName: string; region: string } {
    // CRITICAL FIX 1: Access via `.awsCodeCommit` is not an array index property. 
    // It is resolved via the standard byUrl getter function block.
    const integration = this.integrations.awsCodeCommitByUrl(repoUrl);
    if (!integration) {
      throw new Error(`No AWS CodeCommit integration found configured for URL: ${repoUrl}`);
    }

    let region = 'us-east-1';
    let repoName = '';

    try {
      const urlObj = new URL(repoUrl);
      const hostParts = urlObj.host.split('.');

      if (hostParts.length > 1 && hostParts[0] !== 'codecommit') {
        region = hostParts[1];
      }

      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      repoName = pathParts[pathParts.length - 1].replace(/\.git$/, '');

      if (!repoName) throw new Error();
    } catch {
      throw new Error(`AwsCodeCommitDriver could not parse repository URL: ${repoUrl}`);
    }

    const client = new CodeCommitClient({
      region,
      // Access keys on the baseline config can evaluate to undefined. 
      // We must casting block to string or provide empty fallbacks to satisfy the SDK contract.
      credentials: integration.config.accessKeyId && integration.config.secretAccessKey ? {
        accessKeyId: integration.config.accessKeyId,
        secretAccessKey: integration.config.secretAccessKey,
      } : undefined,
    });

    return { client, repoName, region };
  }

  async getRepositoryMetadata(repoUrl: string): Promise<RepositoryMetadata> {
    const { client, repoName, region } = this.getClientForRepo(repoUrl);

    const command = new GetRepositoryCommand({ repositoryName: repoName });
    const response = await client.send(command);
    const repoMetadata = response.repositoryMetadata;

    return {
      owner: region,
      name: repoName,
      defaultBranch: repoMetadata?.defaultBranch ?? 'main',
      provider: this.providerId,
      url: repoUrl,
    };
  }

  async readFile(repoUrl: string, path: string, ref?: string): Promise<string> {
    const { client, repoName } = this.getClientForRepo(repoUrl);
    const cleanPath = path.replace(/^\//, '');

    try {
      const command = new GetFileCommand({
        repositoryName: repoName,
        filePath: cleanPath,
        commitSpecifier: ref ?? 'HEAD',
      });

      const response = await client.send(command);

      if (!response.fileContent) {
        throw new Error('File content empty');
      }

      // CRITICAL FIX 2: AWS CodeCommit SDK returns fileContent as a raw Uint8Array.
      // In modern environments, Buffer.from() safely wraps it with perfect type-safety.
      return Buffer.from(response.fileContent).toString('utf8');
    } catch (error: any) {
      this.logger.error(`AwsCodeCommitDriver failed to read path ${cleanPath}: ${error.message}`);
      throw error;
    }
  }

  async searchRepository(_repoUrl: string, query: string): Promise<RepositorySearchResult[]> {
    this.logger.warn(`Search requested on AWS CodeCommit for query: "${query}". Fallback array returned.`);
    return [];
  }

  async listPullRequests(repoUrl: string): Promise<PullRequestSummary[]> {
    const { client, repoName } = this.getClientForRepo(repoUrl);

    const listCommand = new ListPullRequestsCommand({
      repositoryName: repoName,
      pullRequestStatus: 'OPEN',
      maxResults: 20,
    });
    const listResponse = await client.send(listCommand);
    const prIds = listResponse.pullRequestIds ?? [];

    const summaries = await Promise.all(
      prIds.map(async (id) => {
        const getCommand = new GetPullRequestCommand({ pullRequestId: id });
        const prResponse = await client.send(getCommand);
        const pr = prResponse.pullRequest;
        const target = pr?.pullRequestTargets?.[0];

        return {
          number: id,
          title: pr?.title ?? '',
          headBranch: target?.sourceReference?.replace('refs/heads/', '') ?? '',
          baseBranch: target?.destinationReference?.replace('refs/heads/', '') ?? '',
          state: 'open' as const,
          url: `${repoUrl}/pull-request/${id}`,
          author: pr?.authorArn?.split('/').pop(),
        };
      })
    );

    return summaries;
  }
}
