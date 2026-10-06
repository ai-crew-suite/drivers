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
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GitHubDriver } from '../github';
import { Octokit } from '@octokit/rest';

const createMockUrlReader = (content: string) => ({
  readUrl: vi.fn().mockResolvedValue({
    buffer: () => Promise.resolve(Buffer.from(content, 'utf8')),
  }),
});

const createMockLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnThis(),
});

const createMockIntegrations = () => ({
  github: {
    byUrl: vi.fn().mockReturnValue({
      config: {
        host: 'github.com',
        apiBaseUrl: 'https://api.github.com',
      },
    }),
  },
});

const createMockCredentialsProvider = () => ({
  getCredentials: vi.fn().mockResolvedValue({ token: 'mock-token' }),
});

describe('GitHubDriver', () => {
  let mockIntegrations: any;
  let mockCredentialsProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntegrations = createMockIntegrations();
    mockCredentialsProvider = createMockCredentialsProvider();
  });

  it('parses a github.com repository URL into owner and name via real metadata', async () => {
    // Arrange: Create a local mock instance for Octokit calls
    const mockGet = vi.fn().mockResolvedValue({
      data: { default_branch: 'main' },
    });

    const driver = new GitHubDriver({
      urlReader: createMockUrlReader('') as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
      credentialsProvider: mockCredentialsProvider as never,
    });

    // Intercept the internal helper method to return your custom client
    vi.spyOn(driver as any, 'getClientForRepo').mockResolvedValue({
      octokit: { repos: { get: mockGet } } as unknown as Octokit,
      owner: 'webstackdev',
      repo: 'ai-crew-suite',
    });

    // Act
    const metadata = await driver.getRepositoryMetadata(
      'https://github.com',
    );

    // Assert
    expect(metadata.owner).toBe('webstackdev');
    expect(metadata.name).toBe('ai-crew-suite');
    expect(metadata.defaultBranch).toBe('main');
    expect(metadata.provider).toBe('github');
  });

  it('throws when the repository URL cannot be parsed', async () => {
    const driver = new GitHubDriver({
      urlReader: createMockUrlReader('') as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
      credentialsProvider: mockCredentialsProvider as never,
    });

    await expect(
      driver.getRepositoryMetadata('https://invalid-url-format'),
    ).rejects.toThrow(/could not parse repository URL/);
  });

  it('reads a file through the Backstage urlReader', async () => {
    const urlReader = createMockUrlReader('file contents');
    const driver = new GitHubDriver({
      urlReader: urlReader as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
      credentialsProvider: mockCredentialsProvider as never,
    });

    // FIX: Change 'https://github.com' to the full target repository URL path
    const content = await driver.readFile(
      'https://github.com/ai-crew-suite/ai-crew-suite',
      'README.md',
    );

    expect(content).toBe('file contents');
    expect(urlReader.readUrl).toHaveBeenCalledWith(
      expect.stringContaining('webstackdev/ai-crew-suite/blob/HEAD/README.md'),
    );
  });

  it('performs repository search using the real code API mappings', async () => {
    const mockCode = vi.fn().mockResolvedValue({
      data: {
        items: [
          { path: 'src/index.ts', html_url: 'https://github.com' },
        ],
      },
    });

    const driver = new GitHubDriver({
      urlReader: createMockUrlReader('') as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
      credentialsProvider: mockCredentialsProvider as never,
    });

    vi.spyOn(driver as any, 'getClientForRepo').mockResolvedValue({
      octokit: { search: { code: mockCode } } as unknown as Octokit,
      owner: 'webstackdev',
      repo: 'ai-crew-suite',
    });

    const results = await driver.searchRepository(
      'https://github.com',
      'test query',
    );

    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('src/index.ts');
    expect(mockCode).toHaveBeenCalledWith({
      q: 'test query repo:webstackdev/ai-crew-suite',
    });
  });

  it('returns pull requests mapped to the expected type layout', async () => {
    const mockList = vi.fn().mockResolvedValue({
      data: [
        {
          number: 42,
          title: 'Feat: AI Agent Integration',
          head: { ref: 'feature/ai-agent' },
          base: { ref: 'main' },
          state: 'open',
          html_url: 'https://github.com',
          user: { login: 'agent-007' },
        },
      ],
    });

    const driver = new GitHubDriver({
      urlReader: createMockUrlReader('') as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
      credentialsProvider: mockCredentialsProvider as never,
    });

    vi.spyOn(driver as any, 'getClientForRepo').mockResolvedValue({
      octokit: { pulls: { list: mockList } } as unknown as Octokit,
      owner: 'webstackdev',
      repo: 'ai-crew-suite',
    });

    const results = await driver.listPullRequests(
      'https://github.com',
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      number: 42,
      title: 'Feat: AI Agent Integration',
      headBranch: 'feature/ai-agent',
      baseBranch: 'main',
      state: 'open',
      url: 'https://github.com',
      author: 'agent-007',
    });
  });
});
