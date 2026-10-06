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
import { AzureDriver } from './providers/AzureDriver';

export const toolCloudProvidersModuleAzure = createBackendModule({
  pluginId: 'tools-cloud-providers',
  moduleId: 'azure',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        cloudRegistry: cloudDriversExtensionPoint,
      },
      async init({ config, logger, cloudRegistry }) {
        logger.info('Initializing decoupled AI Azure Cloud Provider module...');

        // Safely extract module-specific block configurations
        const azureConfigSection = config.getOptionalConfig(
          'ai.integrations.cloudProviders.providers.azure'
        );
        const region = azureConfigSection?.getOptionalString('location') || 'eastus';

        const driver = new AzureDriver({
          logger: logger.child({ label: 'cloud-provider-azure-driver' }),
          rootConfig: config,
          config: { region },
        });

        // Register seamlessly into the core backend's dynamic extension engine
        cloudRegistry.registerDriver(driver);
      },
    });
  },
});

export default toolCloudProvidersModuleAzure;
