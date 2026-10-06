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
import { BitbucketDriver } from '../bitbucket';

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

describe('BitbucketDriver', () => {
  let mockIntegrations: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Clean up stubs so they do not accidentally overwrite parameters inside resolveIntegrationContext
    mockIntegrations = {
      bitbucketCloud: { byUrl: vi.fn() },
      bitbucketServer: { byUrl: vi.fn() },
    };
  });

  it('correctly categorizes and evaluates a Bitbucket Cloud repository layout URL', async () => {
    const driver = new BitbucketDriver({
      urlReader: createMockUrlReader('') as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
    });

    // Fix: Intercept Node's native global fetch implementation
    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      statusText: 'OK',
      json: () => Promise.resolve({ mainbranch: { name: 'development' } }),
    } as Response);

    // Spy directly on the internal parser to isolate the payload
    vi.spyOn(driver as any, 'resolveIntegrationContext').mockReturnValue({
      isCloud: true,
      workspace: 'my-workspace',
      repoSlug: 'my-slug',
      apiBaseUrl: 'https://bitbucket.org',
    });

    const metadata = await driver.getRepositoryMetadata(
      'https://bitbucket.internal/projects/PROJ/repos/my-shared-app',
    );

    expect(metadata.owner).toBe('my-workspace');
    expect(metadata.name).toBe('my-slug');
    expect(metadata.defaultBranch).toBe('development');
    expect(metadata.provider).toBe('bitbucket');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://bitbucket.org/repositories/my-workspace/my-slug',
      expect.any(Object),
    );
  });

  it('correctly processes and extracts custom projects from Bitbucket Server context paths', async () => {
    const driver = new BitbucketDriver({
      urlReader: createMockUrlReader('') as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
    });

    // Fix: Intercept Node's native global fetch implementation
    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      statusText: 'OK',
      json: () => Promise.resolve({ defaultBranch: 'main-prod' }),
    } as Response);

    vi.spyOn(driver as any, 'resolveIntegrationContext').mockReturnValue({
      isCloud: false,
      projectKey: 'PROJ',
      repoSlug: 'my-shared-app',
      apiBaseUrl: 'https://bitbucket.internal',
    });

    const metadata = await driver.getRepositoryMetadata(
      'https://bitbucket.internal/projects/PROJ/repos/my-shared-app',
    );

    expect(metadata.owner).toBe('PROJ');
    expect(metadata.name).toBe('my-shared-app');
    expect(metadata.defaultBranch).toBe('main-prod');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://bitbucket.internal/projects/PROJ/repos/my-shared-app',
      expect.any(Object),
    );
  });
});

