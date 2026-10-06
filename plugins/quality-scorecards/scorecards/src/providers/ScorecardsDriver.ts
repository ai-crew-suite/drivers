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
import { Config } from '@backstage/config';
import { DEFAULT_NAMESPACE, parseEntityRef } from '@backstage/catalog-model';
import {
  QualityScorecardsDriver,
  EntityScorecardSummary,
  ScorecardCheckResult,
  TechRadarProposalResponse,
} from '@ai-crew-suite/plugin-kernel-node';

/**
 * JSON payload shape served from the scorecards data URL. Mirrors the
 * EntityScore/EntityScoreArea/EntityScoreEntry contract consumed by the
 * frontend-only @oriflame/backstage-plugin-score-card plugin (see its
 * ScoringDataJsonClient), whose `scoreSuccess` values come from its
 * ScoreSuccessEnum.
 */
type ScorecardJsonEntry = {
  id: number;
  title: string;
  isOptional: boolean;
  scorePercent: number;
  scoreLabel?: string;
  scoreSuccess: string;
  details: string;
};

type ScorecardJsonArea = {
  id: number;
  title: string;
  scorePercent: number;
  scoreSuccess: string;
  scoreEntries: ScorecardJsonEntry[];
};

type ScorecardJsonDocument = {
  scorePercent: number;
  scoreSuccess: string;
  areaScores: ScorecardJsonArea[];
};

export interface ScorecardsDriverOptions {
  logger: any;
  config: Config;
}

export class ScorecardsDriver implements QualityScorecardsDriver {
  readonly providerId = 'scorecards';
  private readonly logger: any;
  private readonly config: Config;

  constructor(options: ScorecardsDriverOptions) {
    this.logger = options.logger;
    this.config = options.config;
  }

  async getEntityScorecard(entityRef: string): Promise<EntityScorecardSummary> {
    this.logger.debug(`Querying community scorecards registry matrix for: ${entityRef}`);

    // Mirror the ScoringDataJsonClient URL convention:
    //   <scorecards.jsonDataUrl><namespace>/<kind>/<name>.json
    // (the per-entity `scorecard/jsonDataUrl` annotation override is only
    // resolved by the frontend plugin and is not applied here).
    const { kind, namespace = DEFAULT_NAMESPACE, name } = parseEntityRef(entityRef);
    const baseUrl =
      this.config.getOptionalString('scorecards.jsonDataUrl') ??
      'https://unknown-url-please-configure/';
    const dataUrl = `${baseUrl}${namespace}/${kind}/${name}.json`.toLowerCase();

    const response = await fetch(dataUrl);
    if (response.status === 404) {
      throw new Error(`No scorecard data found for entity ${entityRef} at ${dataUrl}`);
    }
    if (!response.ok) {
      throw new Error(
        `Failed to fetch scorecard data for entity ${entityRef} from ${dataUrl}: HTTP ${response.status}`,
      );
    }
    const score = (await response.json()) as ScorecardJsonDocument;

    // Flatten the area -> entry hierarchy into the predictable summary contract
    const results: ScorecardCheckResult[] = (score.areaScores ?? []).flatMap(area =>
      (area.scoreEntries ?? []).map(entry => ({
        checkId: `${area.id}.${entry.id}`,
        name: entry.title,
        description: entry.details,
        category: area.title,
        status: this.mapScoreSuccess(entry.scoreSuccess),
        factValue: entry.scorePercent,
        targetValue: 100,
      })),
    );

    return {
      entityRef,
      overallStatus: this.mapScoreSuccess(score.scoreSuccess),
      score: {
        earned: score.scorePercent,
        possible: 100,
      },
      results,
    };
  }

  async submitRadarProposal(): Promise<TechRadarProposalResponse> {
    throw new Error('Scorecards driver does not manage architecture radar modifications.');
  }

  private mapScoreSuccess(scoreSuccess: string): 'passed' | 'failed' | 'warning' {
    switch (scoreSuccess) {
      case 'success':
      case 'almost-success':
        return 'passed';
      case 'partial':
        return 'warning';
      case 'almost-failure':
      case 'failure':
        return 'failed';
      default:
        return 'warning';
    }
  }
}
