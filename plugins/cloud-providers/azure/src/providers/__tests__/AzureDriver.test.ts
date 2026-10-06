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
import { mockServices } from '@backstage/backend-test-utils';
import { AzureDriver } from '../AzureDriver';
import { ResourceManagementClient } from '@azure/arm-resources';

vi.mock('@azure/arm-resources', () => {
  return {
    ResourceManagementClient: vi.fn().mockImplementation(() => ({
      resources: {
        list: vi.fn(),
      },
    })),
  };
});

vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn().mockImplementation(() => ({})),
}));

describe('AzureDriver Integration Evaluation', () => {
  const mockLogger = { debug: vi.fn(), error: vi.fn() };

  const mockRootConfig = mockServices.rootConfig({ data: {
    integrations: {
      azure: {
        subscriptionId: 'sub-12345-abcde',
      },
    },
  }});

  let driver: AzureDriver;

  beforeEach(() => {
    vi.clearAllMocks();
    driver = new AzureDriver({
      logger: mockLogger,
      rootConfig: mockRootConfig,
      config: { region: 'westus2' },
    });
  });

  it('correctly isolates active subscription targets and formats resource profiles', async () => {
    const mockListResources = async function* mockListResources() {
      yield {
        id: '/subscriptions/sub-12345-abcde/resourceGroups/rg-core/providers/Microsoft.Compute/virtualMachines/vm-node-01',
        name: 'vm-node-01',
        type: 'Microsoft.Compute/virtualMachines',
        location: 'westus2',
        tags: {
          owner: 'platform-engineering-team',
          'backstage.io/component': 'component:default/compute-node',
        },
      };
    };

    vi.mocked(ResourceManagementClient).mockImplementation(function () {
      return {
      resources: {
        list: mockListResources,
      },
      } as any;
    });

    const resources = await driver.lookupResource({ service: 'Microsoft.Compute/virtualMachines' });

    expect(resources).toHaveLength(1);
    expect(resources[0].id).toContain('vm-node-01');
  });
});
