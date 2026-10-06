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
import { IntegrationProviderConfig } from '@ai-crew-suite/plugin-kernel-node';

/**
 * Reads the driver selector from `ai.integrations.compliance`.
 *
 * Provider connection details are owned by sibling driver modules, so this
 * reader only resolves which registered driver should back the shared tools.
 */
export const readComplianceConfig = (
  config: Config,
): IntegrationProviderConfig => {
  const complianceConfig = config.getOptionalConfig('ai.integrations.compliance');
  if (!complianceConfig) {
    throw new Error(
      'Compliance module requires ai.integrations.compliance configuration to be set',
    );
  }

  const provider = complianceConfig.getOptionalString('provider');
  if (!provider) {
    throw new Error(
      'Compliance module requires ai.integrations.compliance.provider to be set',
    );
  }

  return { provider };
};
