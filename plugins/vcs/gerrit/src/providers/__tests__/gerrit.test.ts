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
import { GerritDriver } from '../gerrit';

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

describe('GerritDriver', () => {
  let mockIntegrations: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntegrations = {
      gerrit: {
        byUrl: vi.fn().mockReturnValue({
          config: { baseUrl: 'https://gerrit.internal', username: 'user', password: 'token' },
        }),
      },
    };
  });

  it('safely bypasses and strips the anti-XSS prefix text from gerrit streams', async () => {
    const driver = new GerritDriver({
      urlReader: createMockUrlReader('') as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
    });

    // Mock native fetch returning anti-XSS prefixed payload text blocks
    const mockFetch = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(`)]}'\n{"branches": ["master"]}`),
    } as Response);

    vi.spyOn(driver as any, 'resolveIntegrationContext').mockReturnValue({
      baseUrl: 'https://gerrit.internal',
      projectKey: 'core-infra/platform',
    });

    const metadata = await driver.getRepositoryMetadata(
      'https://gerrit.internal',
    );

    expect(metadata.name).toBe('platform');
    expect(metadata.owner).toBe('core-infra');
    expect(metadata.defaultBranch).toBe('master');
    expect(metadata.provider).toBe('gerrit');
    expect(mockFetch).toHaveBeenCalled();
  });

  it('correctly reads base64 content vectors out of file response records', async () => {
    const driver = new GerritDriver({
      urlReader: createMockUrlReader('') as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
    });

    const b64Payload = Buffer.from('gerrit build layout constraints', 'utf8').toString('base64');
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(b64Payload),
    } as Response);

    vi.spyOn(driver as any, 'resolveIntegrationContext').mockReturnValue({
      baseUrl: 'https://gerrit.internal',
      projectKey: 'core-infra/platform',
    });

    const content = await driver.readFile(
      'https://gerrit.internal',
      'BUILD',
    );

    expect(content).toBe('gerrit build layout constraints');
  });
});
