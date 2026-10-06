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
import { coreServices, createBackendModule } from '@backstage/backend-plugin-api';
import { qualityScorecardsExtensionPoint } from '@ai-crew-suite/plugin-kernel-node';
import { ScorecardsDriver } from './providers/ScorecardsDriver';

export const toolQualityScorecardsModuleScorecards = createBackendModule({
  pluginId: 'tools-quality-scorecards',
  moduleId: 'scorecards',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        qualityRegistry: qualityScorecardsExtensionPoint,
      },
      async init({ config, logger, qualityRegistry }) {
        logger.info(
          'Initializing AI Quality Scorecards open-source catalog provider module...',
        );

        // The Oriflame score-card plugin is frontend-only: it exposes no
        // backend service ref. Its ScoringDataJsonClient reads JSON files from
        // the configured `scorecards.jsonDataUrl`, so the driver consumes that
        // same data source directly using the platform config object.
        const driver = new ScorecardsDriver({
          logger: logger.child({ label: 'quality-scorecards-scorecards-driver' }),
          config,
        });

        // Register seamlessly into the shared core orchestrator mapping registry matrix
        qualityRegistry.registerDriver(driver);
      },
    });
  },
});

export default toolQualityScorecardsModuleScorecards;
