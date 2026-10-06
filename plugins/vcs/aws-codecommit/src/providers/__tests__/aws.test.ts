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
import { AwsCodeCommitDriver } from '../aws';
import { CodeCommitClient } from '@aws-sdk/client-codecommit';

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

describe('AwsCodeCommitDriver', () => {
  let mockIntegrations: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIntegrations = {
      awsCodeCommit: {
        byUrl: vi.fn().mockReturnValue({
          config: { accessKeyId: 'fake-key', secretAccessKey: 'fake-secret' },
        }),
      },
    };
  });

  it('safely evaluates an AWS CodeCommit URL and hydrates metadata fields', async () => {
    const driver = new AwsCodeCommitDriver({
      urlReader: createMockUrlReader('') as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
    });

    const mockSend = vi.spyOn(CodeCommitClient.prototype, 'send').mockResolvedValue({
      repositoryMetadata: { defaultBranch: 'development' },
    } as any);

    // Fix: Spy directly on the internal parser to isolate the payload
    vi.spyOn(driver as any, 'getClientForRepo').mockReturnValue({
      client: new CodeCommitClient({ region: 'us-west-2' }),
      repoName: 'ai-agent-engine',
      region: 'us-west-2',
    });

    const metadata = await driver.getRepositoryMetadata(
      'https://amazonaws.com',
    );

    expect(metadata.owner).toBe('us-west-2');
    expect(metadata.name).toBe('ai-agent-engine');
    expect(metadata.defaultBranch).toBe('development');
    expect(metadata.provider).toBe('aws-codecommit');
    expect(mockSend).toHaveBeenCalled();
  });

  it('reads Uint8Array stream payloads out of GetFileCommand data frames', async () => {
    const driver = new AwsCodeCommitDriver({
      urlReader: createMockUrlReader('') as never,
      logger: createMockLogger() as never,
      integrations: mockIntegrations as never,
    });

    vi.spyOn(CodeCommitClient.prototype, 'send').mockResolvedValue({
      fileContent: Buffer.from('aws cloud configuration matrix', 'utf8'),
    } as any);

    // Fix: Spy directly on the internal parser to isolate the payload
    vi.spyOn(driver as any, 'getClientForRepo').mockReturnValue({
      client: new CodeCommitClient({ region: 'us-east-1' }),
      repoName: 'ai-agent-engine',
      region: 'us-east-1',
    });

    const content = await driver.readFile(
      'https://amazonaws.com',
      'appspec.yml',
    );

    expect(content).toBe('aws cloud configuration matrix');
  });
});
