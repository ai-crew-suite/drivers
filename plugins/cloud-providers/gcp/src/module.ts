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
import { cloudDriversExtensionPoint } from '@ai-crew-suite/plugin-kernel-node';
import { GcpDriver } from './providers/GcpDriver';

export const toolCloudProvidersModuleGcp = createBackendModule({
  pluginId: 'tools-cloud-providers',
  moduleId: 'gcp',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        cloudRegistry: cloudDriversExtensionPoint,
      },
      async init({ config, logger, cloudRegistry }) {
        logger.info('Initializing decoupled AI GCP Cloud Provider module...');

        const gcpConfigSection = config.getOptionalConfig(
          'ai.integrations.cloudProviders.providers.gcp'
        );
        const region = gcpConfigSection?.getOptionalString('zone') || 'us-central1';

        const driver = new GcpDriver({
          logger: logger.child({ label: 'cloud-provider-gcp-driver' }),
          rootConfig: config,
          config: { region },
        });

        cloudRegistry.registerDriver(driver);
      },
    });
  },
});

export default toolCloudProvidersModuleGcp;
