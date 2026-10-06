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
import { observabilityDriversExtensionPoint } from '@ai-crew-suite/plugin-kernel-node';
import { DatadogDriver } from './providers/DatadogDriver';
import { readDatadogConfig } from './config';

/**
 * Datadog driver backend module for the AI Crew Suite observability group.
 */
export const toolObservabilityModuleDatadog = createBackendModule({
  pluginId: 'tools-observability',
  moduleId: 'datadog',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        observabilityRegistry: observabilityDriversExtensionPoint,
      },
      async init({ config, logger, observabilityRegistry }) {
        logger.info('Initializing decoupled Datadog observability driver module...');

        observabilityRegistry.registerDriver(
          new DatadogDriver({
            logger: logger.child({ label: 'observability-datadog-driver' }),
            config: readDatadogConfig(config),
          }),
        );
      },
    });
  },
});

export default toolObservabilityModuleDatadog;
