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
import { GcpDriver } from '../GcpDriver';
import { ProjectsClient } from '@google-cloud/resource-manager';

vi.mock('@google-cloud/resource-manager', () => {
  return {
    ProjectsClient: vi.fn().mockImplementation(() => ({
      getProject: vi.fn(),
    })),
  };
});

describe('GcpDriver Integration Evaluation', () => {
  const mockLogger = { debug: vi.fn(), error: vi.fn() };
  
  const mockRootConfig = mockServices.rootConfig({ data: {
    integrations: {
      gcp: {
        projectId: 'gcp-platform-prod',
      },
    },
  }});

  let driver: GcpDriver;

  beforeEach(() => {
    vi.clearAllMocks();
    driver = new GcpDriver({
      logger: mockLogger,
      rootConfig: mockRootConfig,
      config: { region: 'us-east4' },
    });
  });

  it('correctly isolates active project configurations and normalizes resource label maps', async () => {
    const mockGetProject = vi.fn().mockResolvedValue([{
      name: 'projects/gcp-platform-prod',
      projectId: 'gcp-platform-prod',
      labels: {
        owner: 'data-analytics-crew',
        backstage_io_component: 'component:default/analytics-pipeline',
      },
    }]);

    vi.mocked(ProjectsClient).mockImplementation(function () {
      return {
      getProject: mockGetProject,
      } as any;
    });

    const resources = await driver.lookupResource({});

    expect(mockGetProject).toHaveBeenCalledWith({ name: 'projects/gcp-platform-prod' });
    expect(resources).toHaveLength(1);
    expect(resources[0]).toEqual({
      id: 'projects/gcp-platform-prod',
      type: '://googleapis.com',
      provider: 'gcp',
      region: 'us-east4',
      tags: {
        owner: 'data-analytics-crew',
        backstage_io_component: 'component:default/analytics-pipeline',
      },
      owner: 'data-analytics-crew',
      catalogEntityRef: 'component:default/analytics-pipeline',
    });
  });
});
