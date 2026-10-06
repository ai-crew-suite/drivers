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
import { randomUUID } from 'crypto';
import { Config } from '@backstage/config';
import { 
  QualityScorecardsDriver, 
  EntityScorecardSummary, 
  TechRadarProposalInput, 
  TechRadarProposalResponse 
} from '@ai-crew-suite/plugin-kernel-node';

export interface TechRadarDriverOptions {
  logger: any;
  config: Config;
}

export class TechRadarDriver implements QualityScorecardsDriver {
  readonly providerId = 'tech-radar';
  private readonly logger: any;
  private readonly config: Config;
  // Private module state mirroring active agent proposal entries
  private readonly draftProposals = new Map<string, any>();

  constructor(options: TechRadarDriverOptions) {
    this.logger = options.logger;
    this.config = options.config;
  }

  async getEntityScorecard(entityRef: string): Promise<EntityScorecardSummary> {
    this.logger.warn(`getEntityScorecard invoked on radar-only driver for entity: ${entityRef}`);
    throw new Error('TechRadar driver does not manage software component scorecards data records.');
  }

  async submitRadarProposal(input: TechRadarProposalInput): Promise<TechRadarProposalResponse> {
    this.logger.info(`Submitting agent-initiated TechRadar adaptation pitch: ${input.title}`);

    // Verify whether a custom destination URL is available within platform configuration targets
    const techRadarUrl = this.config.getOptionalString('techRadar.url') || 'local-mock-radar';
    this.logger.debug(`Targeting radar backend manifest location context: ${techRadarUrl}`);

    const generatedProposalId = `prop-${randomUUID()}`;
    
    // Commit the proposal changes directly into our local tracking registry map 
    this.draftProposals.set(generatedProposalId, {
      id: generatedProposalId,
      quadrant: input.quadrantId,
      ring: input.ringId,
      title: input.title,
      description: `${input.description} (Reason: ${input.reason})`,
      state: 'PROPOSED_BY_AGENT',
    });

    return {
      proposalId: generatedProposalId,
      status: 'submitted',
      message: 'Radar update recommendation successfully queued for architecture governance review loops.',
    };
  }
}
