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
import { ScmIntegrations, DefaultGithubCredentialsProvider } from '@backstage/integration';
import { vcsDriversExtensionPoint } from '@ai-crew-suite/plugin-kernel-node';
import { GitHubDriver } from './providers/github';

/**
 * GitHub VCS driver backend module for the AI Core plugin.
 */
export const toolVcsModuleGitHub = createBackendModule({
  pluginId: 'tools-vcs',
  moduleId: 'github',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        urlReader: coreServices.urlReader,
        config: coreServices.rootConfig,
        // Bind to the shared VCS registration desk
        vcsRegistry: vcsDriversExtensionPoint,
      },
      async init({ logger, urlReader, config, vcsRegistry }) {
        logger.info('Initializing decoupled GitHub VCS driver module...');

        // Resolve structural integrations and credentials factories out of root configurations
        const integrations = ScmIntegrations.fromConfig(config);
        const credentialsProvider = DefaultGithubCredentialsProvider.fromIntegrations(integrations);

        // Instantiate the localized GitHub driver
        const githubDriver = new GitHubDriver({
          urlReader,
          logger: logger.child({ label: 'vcs-github' }),
          integrations,
          credentialsProvider,
        });

        // Register the driver dynamically to fulfill the core tool requests
        vcsRegistry.registerDriver(githubDriver);
      },
    });
  },
});

export default toolVcsModuleGitHub;
