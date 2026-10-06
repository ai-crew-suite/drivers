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
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import {
  ComplianceDriver,
  complianceDriversExtensionPoint,
  toolExtensionPoint,
} from '@ai-crew-suite/plugin-kernel-node';
import { readComplianceConfig } from './config';
import { createComplianceTools } from './tools';

export const aiCoreBackendModuleCompliance = createBackendPlugin({
  pluginId: 'tools-compliance',
  register(env) {
    const drivers = new Map<string, ComplianceDriver>();

    env.registerExtensionPoint(complianceDriversExtensionPoint, {
      registerDriver(driver) {
        drivers.set(driver.providerId, driver);
      },
    });

    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        tools: toolExtensionPoint,
      },
      async init({ config, logger, tools }) {
        const { provider } = readComplianceConfig(config);
        const driver = drivers.get(provider);
        if (!driver) {
          throw new Error(
            `No compliance driver registered for identifier '${provider}'. ` +
              `Ensure the matching @ai-crew-suite/plugin-kernel-backend-module-compliance-${provider} package is imported in your backend index.ts file.`,
          );
        }

        logger.info(
          `Initializing active compliance agent wrapper utilizing registered driver: '${driver.providerId}'`,
        );

        for (const tool of createComplianceTools({ driver, logger })) {
          tools.addTool(tool);
        }
      },
    });
  },
});

export default aiCoreBackendModuleCompliance;
