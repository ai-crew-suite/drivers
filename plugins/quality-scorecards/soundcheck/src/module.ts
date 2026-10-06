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
import { soundcheckBackendClientServiceRef } from '@spotify/backstage-plugin-soundcheck-node';
import { qualityScorecardsExtensionPoint } from '@ai-crew-suite/plugin-kernel-node';
import { SoundcheckDriver } from './providers/SoundcheckDriver';

export const toolQualityScorecardsModuleSoundcheck = createBackendModule({
  pluginId: 'tools-quality-scorecards',
  moduleId: 'soundcheck',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        soundcheckService: soundcheckBackendClientServiceRef,
        qualityRegistry: qualityScorecardsExtensionPoint,
      },
      async init({ logger, soundcheckService, qualityRegistry }) {
        logger.info('Initializing AI Quality Scorecards Soundcheck module utilizing Backstage core service...');

        const driver = new SoundcheckDriver({
          logger: logger.child({ label: 'quality-scorecards-soundcheck-driver' }),
          soundcheckService,
        });

        qualityRegistry.registerDriver(driver);
      },
    });
  },
});

export default toolQualityScorecardsModuleSoundcheck;
