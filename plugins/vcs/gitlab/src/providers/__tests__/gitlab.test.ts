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
import { GitLabDriver } from '../gitlab';

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
  gitlab: {
    byUrl: vi.fn().mockReturnValue({
      config: {
        host: 'gitlab.com',
        baseUrl: 'https://gitlab.com/',
        token: 'mock-token',
      },
    }),
  },
});

describe('GitLabDriver', () => {
  let mockIntegrations: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntegrations = createMockIntegrations();
  });

  it('safely processes a gitlab.com target path metadata extraction', async () => {
    const driver = new GitLabDriver({
      urlReader: createMockUrlReader('') as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
    });

    const mockShow = vi.fn().mockResolvedValue({
      name: 'ai-crew-suite',
      defaultBranch: 'master', // Match camelCase
      namespace: { fullPath: 'webstackdev' }, // Fix: Changed full_path to fullPath to match production code
    });

    vi.spyOn(driver as any, 'getClientForRepo').mockResolvedValue({
      api: { Projects: { show: mockShow } },
      projectPath: 'webstackdev/ai-crew-suite',
    });

    const metadata = await driver.getRepositoryMetadata(
      'https://gitlab.com',
    );

    expect(metadata.owner).toBe('webstackdev');
    expect(metadata.name).toBe('ai-crew-suite');
    expect(metadata.defaultBranch).toBe('master');
    expect(metadata.provider).toBe('gitlab');
  });

  it('reads content using correct unified GitLab URL parameters shape', async () => {
    const urlReader = createMockUrlReader('gitlab continuous content');
    const driver = new GitLabDriver({
      urlReader: urlReader as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
    });

    const content = await driver.readFile(
      'https://gitlab.com/webstackdev/ai-crew-suite',
      '.gitlab-ci.yml',
    );

    expect(content).toBe('gitlab continuous content');
    expect(urlReader.readUrl).toHaveBeenCalledWith(
      expect.stringContaining('webstackdev/ai-crew-suite/blob/HEAD/.gitlab-ci.yml'),
    );
  });
});
