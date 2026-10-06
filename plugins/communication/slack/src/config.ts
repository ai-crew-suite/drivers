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
import { Config } from '@backstage/config';
import { SlackDriverConfig } from './providers/SlackDriver';

/**
 * Reads the Slack connection settings from
 * `ai.integrations.communication.slack`.
 */
export const readSlackConfig = (config: Config): SlackDriverConfig => {
  const slackConfig = config.getOptionalConfig(
    'ai.integrations.communication.slack',
  );

  if (!slackConfig) {
    throw new Error(
      'Slack communication driver requires ai.integrations.communication.slack configuration to be set',
    );
  }

  return {
    token: slackConfig.getString('token'),
    apiBaseUrl: slackConfig.getOptionalString('apiBaseUrl'),
    workspaceDomain: slackConfig.getOptionalString('workspaceDomain'),
  };
};
