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
import { AzureDriver } from '../azure';

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
  azure: {
    byUrl: vi.fn().mockReturnValue({
      config: {
        host: '://azure.com',
        token: 'mock-token',
      },
    }),
  },
});

describe('AzureDriver', () => {
  let mockIntegrations: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntegrations = createMockIntegrations();
  });

  it('safely processes a cloud ://azure.com target URL mapping', async () => {
    const driver = new AzureDriver({
      urlReader: createMockUrlReader('') as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
    });

    const mockGetRepository = vi.fn().mockResolvedValue({
      defaultBranch: 'refs/heads/master',
    });

    vi.spyOn(driver as any, 'getClientForRepo').mockResolvedValue({
      gitApi: { getRepository: mockGetRepository },
      org: 'my-org',
      project: 'my-project',
      repoName: 'my-repo',
    });

    const metadata = await driver.getRepositoryMetadata(
      'https://://azure.com/my-org/my-project/_git/my-repo',
    );

    expect(metadata.owner).toBe('my-project');
    expect(metadata.name).toBe('my-repo');
    expect(metadata.defaultBranch).toBe('master');
    expect(metadata.provider).toBe('azuredevops');
  });

  it('reads content using correct Azure URL parameters shape', async () => {
    const urlReader = createMockUrlReader('azure content');
    const driver = new AzureDriver({
      urlReader: urlReader as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
    });

    const content = await driver.readFile(
      'https://://azure.com/my-org/my-project/_git/my-repo',
      'azure-pipelines.yml',
    );

    expect(content).toBe('azure content');
    expect(urlReader.readUrl).toHaveBeenCalledWith(
      expect.stringContaining('?path=%2Fazure-pipelines.yml'),
    );
  });
});
