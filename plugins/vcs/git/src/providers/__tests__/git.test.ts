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
import gitUrlParse from 'git-url-parse';
import { GenericGitDriver } from '../git';

vi.mock('git-url-parse', () => ({
  default: vi.fn().mockReturnValue({
    source: 'company.com',
    owner: 'legacy-group',
    name: 'monolith-service',
  }),
}));

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

describe('GenericGitDriver', () => {
  let mockIntegrations: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(gitUrlParse).mockReturnValue({
      source: 'company.com',
      owner: 'legacy-group',
      name: 'monolith-service',
    } as ReturnType<typeof gitUrlParse>);
    mockIntegrations = {};
  });

  it('safely extracts name properties from raw HTTPS git targets', async () => {
    const driver = new GenericGitDriver({
      urlReader: createMockUrlReader('') as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
    });

    const metadata = await driver.getRepositoryMetadata(
      'https://company.com',
    );

    expect(metadata.owner).toBe('legacy-group');
    expect(metadata.name).toBe('monolith-service');
    expect(metadata.defaultBranch).toBe('HEAD');
    expect(metadata.provider).toBe('git');
  });

  it('routes raw content fetches cleanly to the parent UrlReader wrapper string', async () => {
    const urlReader = createMockUrlReader('raw un-api legacy file block');
    const driver = new GenericGitDriver({
      urlReader: urlReader as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
    });

    const content = await driver.readFile(
      'https://company.com',
      'configure.sh',
      'v1.2.0',
    );

    expect(content).toBe('raw un-api legacy file block');
    expect(urlReader.readUrl).toHaveBeenCalledWith(
      expect.stringContaining('legacy-group/monolith-service/blob/v1.2.0/configure.sh'),
    );
  });
});
