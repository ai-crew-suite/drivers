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
import { communicationDriversExtensionPoint } from '@ai-crew-suite/plugin-kernel-node';
import { SlackDriver } from './providers/SlackDriver';
import { readSlackConfig } from './config';

/**
 * Slack driver backend module for the AI Core communication group.
 */
export const toolCommunicationModuleCommunicationSlack = createBackendModule({
  pluginId: 'tools-communication',
  moduleId: 'slack',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        messagingRegistry: communicationDriversExtensionPoint,
      },
      async init({ config, logger, messagingRegistry }) {
        logger.info('Initializing decoupled Slack communication driver module...');

        messagingRegistry.registerDriver(
          new SlackDriver({
            logger: logger.child({ label: 'communication-slack-driver' }),
            config: readSlackConfig(config),
          }),
        );
      },
    });
  },
});

export default toolCommunicationModuleCommunicationSlack;
