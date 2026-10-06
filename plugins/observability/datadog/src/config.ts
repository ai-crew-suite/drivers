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
import { DatadogDriverConfig } from './providers/DatadogDriver';

/**
 * Reads the Datadog connection settings from
 * `ai.integrations.observability.datadog`.
 */
export const readDatadogConfig = (config: Config): DatadogDriverConfig => {
  const section = config.getOptionalConfig(
    'ai.integrations.observability.datadog',
  );

  if (!section) {
    throw new Error(
      'Datadog observability driver requires ai.integrations.observability.datadog configuration to be set',
    );
  }

  return {
    apiKey: section.getString('apiKey'),
    applicationKey: section.getString('applicationKey'),
    apiBaseUrl: section.getOptionalString('apiBaseUrl'),
    appBaseUrl: section.getOptionalString('appBaseUrl'),
  };
};
