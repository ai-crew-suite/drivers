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
import { PagerDutyDriverConfig } from './providers/PagerDutyDriver';

/**
 * Reads the PagerDuty connection settings from
 * `ai.integrations.incidentManagement.pagerduty`.
 */
export const readPagerDutyConfig = (config: Config): PagerDutyDriverConfig => {
  const section = config.getOptionalConfig(
    'ai.integrations.incidentManagement.pagerduty',
  );

  if (!section) {
    throw new Error(
      'PagerDuty incident management driver requires ai.integrations.incidentManagement.pagerduty configuration to be set',
    );
  }

  return {
    apiToken: section.getString('apiToken'),
    apiBaseUrl: section.getOptionalString('apiBaseUrl'),
    fromEmail: section.getOptionalString('fromEmail'),
  };
};
