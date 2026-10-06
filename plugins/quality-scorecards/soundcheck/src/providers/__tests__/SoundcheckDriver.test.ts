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
import { SoundcheckDriver } from '../SoundcheckDriver';

describe('SoundcheckDriver Integration Evaluation', () => {
  const mockLogger = { debug: vi.fn(), error: vi.fn(), info: vi.fn() };
  
  // Construct an authentic mock instance mimicking the Spotify backend service contract
  let mockSoundcheckService: any;
  let driver: SoundcheckDriver;

  beforeEach(() => {
    mockSoundcheckService = {
      getTracks: vi.fn(),
    };

    driver = new SoundcheckDriver({
      logger: mockLogger,
      soundcheckService: mockSoundcheckService,
    });
  });

  it('correctly maps raw Spotify Soundcheck program payloads to standardized summary models', async () => {
    const entityRef = 'component:default/order-service';
    
    // Simulate Soundcheck database query outputs
    mockSoundcheckService.getTracks.mockResolvedValueOnce([
      {
        name: 'Engineering',
        levels: [
          {
            checks: [
              {
                id: 'test-coverage-check',
                name: 'SonarQube Test Coverage > 80%',
                description: 'Coverage threshold',
              },
              {
                id: 'pagerduty-integration-check',
                name: 'On-Call PagerDuty Escalation Mapped',
              },
            ],
          },
        ],
      },
    ]);

    const summary = await driver.getEntityScorecard(entityRef);

    expect(mockSoundcheckService.getTracks).toHaveBeenCalledWith();
    expect(summary).toEqual({
      entityRef,
      overallStatus: 'warning',
      results: [
        {
          checkId: 'test-coverage-check',
          name: 'SonarQube Test Coverage > 80%',
          description: 'Coverage threshold',
          category: 'Engineering',
          status: 'skipped',
        },
        {
          checkId: 'pagerduty-integration-check',
          name: 'On-Call PagerDuty Escalation Mapped',
          category: 'Engineering',
          status: 'skipped',
        }
      ],
    });
  });

  it('transparently propagates downstream service rejections up the platform execution track', async () => {
    mockSoundcheckService.getTracks.mockRejectedValueOnce(new Error('Soundcheck Database Connection Interrupted'));

    await expect(
      driver.getEntityScorecard('component:default/unreachable-service')
    ).rejects.toThrow(/Soundcheck Database Connection Interrupted/);
  });
});
