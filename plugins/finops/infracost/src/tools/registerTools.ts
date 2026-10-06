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
import { LoggerService } from '@backstage/backend-plugin-api';
import { ComplianceDriver, ToolDefinition } from '@ai-crew-suite/plugin-kernel-node';

type EvaluatePolicyArgs = { policyId?: string; input: unknown };
type CheckPermissionArgs = { userRef: string; action: string; resource?: string };
type ValidateArchitectureArgs = { proposal: unknown };
type EstimateCostArgs = { proposal: unknown };

export const createComplianceTools = (opts: {
  driver: ComplianceDriver;
  logger: LoggerService;
}): ToolDefinition[] => {
  const { driver, logger } = opts;

  return [
    {
      id: 'compliance.policy.evaluate',
      description: 'Evaluate generated IaC, config, or proposed actions against OPA/Rego or static policy bundles',
      effect: 'read',
      async invoke(args: unknown) {
        const payload = args as EvaluatePolicyArgs;
        logger.debug('compliance.policy.evaluate invoked', { policyId: payload.policyId });
        return driver.evaluatePolicy(payload);
      },
    },
    {
      id: 'compliance.permission.check',
      description: 'Ask whether the triggering user can perform a requested class of action',
      effect: 'read',
      async invoke(args: unknown) {
        const payload = args as CheckPermissionArgs;
        logger.debug('compliance.permission.check invoked', payload);
        return driver.checkPermission(payload);
      },
    },
    {
      id: 'compliance.architecture.validate',
      description: 'Validate proposed architecture against internal static constraints',
      effect: 'read',
      async invoke(args: unknown) {
        const payload = args as ValidateArchitectureArgs;
        logger.debug('compliance.architecture.validate invoked');
        return driver.validateArchitecture(payload);
      },
    },
    {
      id: 'compliance.cost.estimate',
      description: 'Estimate or classify cost impact when the source of truth is a governance/FinOps system',
      effect: 'read',
      async invoke(args: unknown) {
        const payload = args as EstimateCostArgs;
        logger.debug('compliance.cost.estimate invoked');
        return driver.estimateCost(payload);
      },
    },
  ];
};
