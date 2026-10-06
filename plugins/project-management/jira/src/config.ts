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
import { JiraDriverConfig } from './providers/JiraDriver';

/**
 * Reads the Jira connection settings from
 * `ai.integrations.projectManagement.jira`.
 */
export const readJiraConfig = (config: Config): JiraDriverConfig => {
  const jiraConfig = config.getOptionalConfig(
    'ai.integrations.projectManagement.jira',
  );

  if (!jiraConfig) {
    throw new Error(
      'Jira project management driver requires ai.integrations.projectManagement.jira configuration to be set',
    );
  }

  return {
    baseUrl: jiraConfig.getString('baseUrl'),
    email: jiraConfig.getString('email'),
    apiToken: jiraConfig.getString('apiToken'),
    defaultProjectKey: jiraConfig.getOptionalString('defaultProjectKey'),
    defaultIssueType: jiraConfig.getOptionalString('defaultIssueType'),
  };
};
