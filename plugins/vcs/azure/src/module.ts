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
import { createBackendModule, coreServices } from '@backstage/backend-plugin-api';
import { ScmIntegrations } from '@backstage/integration';
import { vcsDriversExtensionPoint } from '@ai-crew-suite/plugin-kernel-node';
import { AzureDriver } from './providers/azure';

/**
 * Azure DevOps VCS driver backend module for the AI Core plugin.
 */
export const aiCoreBackendModuleVcsAzure = createBackendModule({
  pluginId: 'tools-vcs',
  moduleId: 'azure',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        urlReader: coreServices.urlReader,
        config: coreServices.rootConfig,
        // Request access to the core VCS registration desk channel
        vcsRegistry: vcsDriversExtensionPoint,
      },
      async init({ logger, urlReader, config, vcsRegistry }) {
        logger.info('Initializing decoupled Azure DevOps VCS driver module...');

        // Natively instantiate the SCM manager using the core root configuration
        const integrations = ScmIntegrations.fromConfig(config);

        // Instantiate the localized Azure driver
        const azureDriver = new AzureDriver({
          urlReader,
          logger: logger.child({ label: 'vcs-azuredevops' }),
          integrations,
        });

        // Dynamically register the driver into the core registry Map
        vcsRegistry.registerDriver(azureDriver);
      },
    });
  },
});

export default aiCoreBackendModuleVcsAzure;
