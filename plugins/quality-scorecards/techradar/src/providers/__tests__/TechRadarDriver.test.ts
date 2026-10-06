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
import { ConfigReader } from '@backstage/config';
import { TechRadarDriver } from '../TechRadarDriver';

describe('TechRadarDriver Integration Evaluation', () => {
  const mockLogger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
  const mockConfig = new ConfigReader({
    techRadar: {
      url: 'https://githubusercontent.com',
    },
  });
  
  let driver: TechRadarDriver;

  beforeEach(() => {
    // Fixed: Initialized driver cleanly without any unexpected 'techRadarStore' properties
    driver = new TechRadarDriver({
      logger: mockLogger,
      config: mockConfig, 
    });

    vi.restoreAllMocks();
  });

  it('submits agent-initiated quadrant changes and surfaces proposal responses successfully', async () => {
    const proposalInput = {
      quadrantId: 'frameworks',
      ringId: 'trial',
      title: 'Next.js 14 Web Architecture Blueprint',
      description: 'Standardize client-side SSR rendering systems.',
      reason: 'Reduces hydration exceptions encountered in edge analytics widgets.',
    };

    const response = await driver.submitRadarProposal(proposalInput);

    expect(response.proposalId).toBeDefined();
    expect(response.status).toBe('submitted');
    expect(response.message).toContain('Radar update recommendation successfully queued');
  });

  it('throws an unhandled exception when scorecard summaries are requested on a radar-only driver', async () => {
    await expect(
      driver.getEntityScorecard('component:default/any-service')
    ).rejects.toThrow(/TechRadar driver does not manage software component scorecards data records/);
  });
});
