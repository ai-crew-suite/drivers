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
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AwsDriver } from '../AwsDriver';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

vi.mock('@aws-sdk/client-sts');

describe('AwsDriver Standard Integration Suite', () => {
  const mockLogger = { debug: vi.fn(), error: vi.fn() };
  const mockCredentialsManager = {
    getCredentialProvider: vi.fn().mockResolvedValue({
      sdkCredentialProvider: async () => ({
        accessKeyId: 'mock-key',
        secretAccessKey: 'mock-secret',
      }),
    }),
  };

  let driver: AwsDriver;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCredentialsManager.getCredentialProvider.mockResolvedValue({
      sdkCredentialProvider: async () => ({
        accessKeyId: 'mock-key',
        secretAccessKey: 'mock-secret',
      }),
    });
    driver = new AwsDriver({
      logger: mockLogger,
      credentialsManager: mockCredentialsManager as any,
      config: { region: 'us-west-2' },
    });
  });

  it('safely calls credential mapping chains and normalizes AWS output summaries', async () => {
    const sendMock = vi.fn().mockResolvedValue({ Account: '555555555555' });
    vi.mocked(STSClient).mockImplementation(function () {
      return { send: sendMock } as any;
    });

    const account = await driver.lookupAccount();

    expect(mockCredentialsManager.getCredentialProvider).toHaveBeenCalledWith({});
    expect(sendMock).toHaveBeenCalledWith(expect.any(GetCallerIdentityCommand));
    expect(account).toEqual({
      id: '555555555555',
      name: 'AWS Landing Zone',
      provider: 'aws',
      region: 'us-west-2',
    });
  });
});
