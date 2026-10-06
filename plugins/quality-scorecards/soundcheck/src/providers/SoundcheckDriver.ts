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
import {
  QualityScorecardsDriver,
  EntityScorecardSummary,
  ScorecardCheckResult,
  TechRadarProposalResponse,
} from '@ai-crew-suite/plugin-kernel-node';
import { SoundcheckBackendApi } from '@spotify/backstage-plugin-soundcheck-node';

export interface SoundcheckDriverOptions {
  logger: any;
  soundcheckService: SoundcheckBackendApi; // Injected via soundcheckBackendClientServiceRef
}

export class SoundcheckDriver implements QualityScorecardsDriver {
  readonly providerId = 'soundcheck';
  private readonly logger: any;
  private readonly soundcheckService: SoundcheckBackendApi;

  constructor(options: SoundcheckDriverOptions) {
    this.logger = options.logger;
    this.soundcheckService = options.soundcheckService;
  }

  async getEntityScorecard(entityRef: string): Promise<EntityScorecardSummary> {
    this.logger.debug(`Harvesting official Soundcheck check catalog for entity: ${entityRef}`);

    // The Soundcheck backend client exposes the program structure over GraphQL
    // as tracks -> levels -> check descriptors. Per-entity fact evaluations are
    // not surfaced through this service ref, so individual checks are reported
    // as 'skipped' against the track they belong to rather than pass/fail.
    const tracks = await this.soundcheckService.getTracks();

    const results: ScorecardCheckResult[] = tracks.flatMap(track =>
      track.levels.flatMap(level =>
        level.checks.map(check => ({
          checkId: check.id,
          name: check.name,
          description: check.description,
          category: track.name,
          status: 'skipped' as const,
        })),
      ),
    );

    return {
      entityRef,
      overallStatus: results.length > 0 ? 'warning' : 'passed',
      results,
    };
  }

  async submitRadarProposal(): Promise<TechRadarProposalResponse> {
    throw new Error('Soundcheck driver does not support tech radar updates.');
  }
}
