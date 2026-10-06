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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigReader } from '@backstage/config';
import { ScorecardsDriver } from '../ScorecardsDriver';

// The shared test setup globally mocks @backstage/config; restore the real
// ConfigReader here so the driver resolves the configured scorecards data URL.
vi.unmock('@backstage/config');

describe('ScorecardsDriver Integration Evaluation', () => {
  const mockLogger = { debug: vi.fn(), error: vi.fn(), info: vi.fn() };
  const mockFetch = vi.fn();

  let driver: ScorecardsDriver;

  const jsonResponse = (status: number, body?: unknown) =>
    ({
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    } as unknown as Response);

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);

    driver = new ScorecardsDriver({
      logger: mockLogger,
      config: new ConfigReader({
        scorecards: { jsonDataUrl: 'https://scores.example.com/' },
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('correctly maps community scorecards entity records into standardized summary contracts', async () => {
    const entityRef = 'component:default/billing-api';

    // Simulate the open-source scorecard JSON document served from the data URL
    mockFetch.mockResolvedValueOnce(
      jsonResponse(200, {
        scorePercent: 85,
        scoreSuccess: 'success',
        areaScores: [
          {
            id: 1,
            title: 'code-quality',
            scorePercent: 85,
            scoreSuccess: 'success',
            scoreEntries: [
              {
                id: 10,
                title: 'Repository Contains README.md Documentation File',
                isOptional: false,
                scorePercent: 100,
                scoreSuccess: 'success',
                details: 'README.md found at repository root.',
              },
              {
                id: 11,
                title: 'Code Has Been Evaluated By SonarQube Within 7 Days',
                isOptional: false,
                scorePercent: 0,
                scoreSuccess: 'failure',
                details: 'No recent SonarQube analysis detected.',
              },
            ],
          },
        ],
      }),
    );

    const summary = await driver.getEntityScorecard(entityRef);

    // The driver mirrors the ScoringDataJsonClient URL convention
    expect(mockFetch).toHaveBeenCalledWith(
      'https://scores.example.com/default/component/billing-api.json',
    );
    expect(summary).toEqual({
      entityRef,
      overallStatus: 'passed',
      score: {
        earned: 85,
        possible: 100,
      },
      results: [
        {
          checkId: '1.10',
          name: 'Repository Contains README.md Documentation File',
          description: 'README.md found at repository root.',
          category: 'code-quality',
          status: 'passed',
          factValue: 100,
          targetValue: 100,
        },
        {
          checkId: '1.11',
          name: 'Code Has Been Evaluated By SonarQube Within 7 Days',
          description: 'No recent SonarQube analysis detected.',
          category: 'code-quality',
          status: 'failed',
          factValue: 0,
          targetValue: 100,
        },
      ],
    });
  });

  it('flags overall statuses as warning profiles when total metrics fall below thresholds', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse(200, {
        scorePercent: 45,
        scoreSuccess: 'partial',
        areaScores: [],
      }),
    );

    const summary = await driver.getEntityScorecard('component:default/failing-service');
    expect(summary.overallStatus).toBe('warning');
  });

  it('flags missing scorecard documents as descriptive lookup failures', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(404));

    await expect(
      driver.getEntityScorecard('component:default/missing-service'),
    ).rejects.toThrow(/No scorecard data found for entity component:default\/missing-service/);
  });

  it('transparently propagates downstream registry rejections up the framework execution chain', async () => {
    mockFetch.mockRejectedValueOnce(
      new Error('Scorecards backend persistent engine timeout exception'),
    );

    await expect(
      driver.getEntityScorecard('component:default/unreachable-service'),
    ).rejects.toThrow(/Scorecards backend persistent engine timeout exception/);
  });
});
