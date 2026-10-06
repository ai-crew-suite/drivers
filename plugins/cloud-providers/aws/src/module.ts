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
import { DefaultAwsCredentialsManager } from '@backstage/integration-aws-node';
import { cloudDriversExtensionPoint } from '@ai-crew-suite/plugin-kernel-node';
import { AwsDriver } from './providers/AwsDriver';

export const toolCloudProvidersModuleAws = createBackendModule({
  pluginId: 'tools-cloud-providers',
  moduleId: 'aws',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        cloudRegistry: cloudDriversExtensionPoint,
      },
      async init({ config, logger, cloudRegistry }) {
        logger.info('Initializing AI AWS Cloud Provider module utilizing global Backstage integration-aws keys...');

        const awsConfigSection = config.getOptionalConfig(
          'ai.integrations.cloudProviders.providers.aws'
        );
        const region = awsConfigSection?.getOptionalString('region') || 'us-east-1';

        // Spin up the official Backstage credentials manager from the root config map
        const credentialsManager = DefaultAwsCredentialsManager.fromConfig(config);

        const driver = new AwsDriver({
          logger: logger.child({ label: 'cloud-provider-aws-driver' }),
          credentialsManager,
          config: { region },
        });

        cloudRegistry.registerDriver(driver);
      },
    });
  },
});

export default toolCloudProvidersModuleAws;
