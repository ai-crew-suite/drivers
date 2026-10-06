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
import { DefaultAzureCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';
import { Config } from '@backstage/config';
import {
  CloudProviderDriver,
  CloudAccountSummary,
  CloudResourceSummary,
  CloudDependencySummary
} from '@ai-crew-suite/plugin-kernel-node';

/**
 * Isolated parameters required to instantiate the concrete Azure Cloud Provider adapter.
 * Managed entirely within the scope of this provider module package.
 */
export interface AzureDriverOptions {
  logger: any;
  rootConfig: Config;
  config: { region: string };
}

export class AzureDriver implements CloudProviderDriver {
  readonly providerId = 'azure';
  private readonly logger: any;
  private readonly rootConfig: Config;
  private readonly region: string;

  constructor(options: AzureDriverOptions) {
    this.logger = options.logger;
    this.rootConfig = options.rootConfig;
    this.region = options.config.region;
  }

  /**
   * Helper to retrieve subscription targets from configuration or fallback variables.
   */
  private getSubscriptionId(): string {
    const azureIntegration = this.rootConfig.getOptionalConfig('integrations.azure');
    // Attempt parsing dedicated configuration variables or fall back to native environment indicators
    return azureIntegration?.getOptionalString('subscriptionId') || process.env['AZURE_SUBSCRIPTION_ID'] || 'unknown-subscription';
  }

  async lookupAccount(): Promise<CloudAccountSummary | undefined> {
    const subscriptionId = this.getSubscriptionId();
    this.logger.debug(`Mapping Azure tenant credentials context for subscription: ${subscriptionId}`);

    return {
      id: subscriptionId,
      name: 'Azure Active Subscription Context',
      provider: this.providerId,
      region: this.region,
    };
  }

  async lookupResource(input: { service?: string; tags?: Record<string, string> }): Promise<CloudResourceSummary[]> {
    const subscriptionId = this.getSubscriptionId();
    this.logger.debug('Polling Azure Resource Manager API for asset inventory metrics');

    try {
      const credential = new DefaultAzureCredential();
      const client = new ResourceManagementClient(credential, subscriptionId);

      // Build target OData search filter string queries if specific boundaries are requested
      let filter: string | undefined = undefined;
      if (input.service) {
        filter = `resourceType eq '${input.service}'`;
      }

      const summaries: CloudResourceSummary[] = [];
      const resourcesList = client.resources.list({ filter });

      for await (const resource of resourcesList) {
        // Enforce tag filter validation loops directly within incoming stream arrays
        if (input.tags) {
          const match = Object.entries(input.tags).every(([k, v]) => resource.tags?.[k] === v);
          if (!match) continue;
        }

        const id = resource.id || 'unknown-id';
        const tagsObj = resource.tags || {};

        summaries.push({
          id,
          type: resource.type || 'unknown',
          provider: this.providerId,
          region: resource.location || this.region,
          tags: tagsObj,
          owner: tagsObj['owner'] || tagsObj['team'],
          catalogEntityRef: tagsObj['backstage.io/component'],
        });
      }

      return summaries;
    } catch (err: any) {
      this.logger.error(`Error gathering live Azure asset tracking topology matrix: ${err.message}`);
      throw err;
    }
  }

  async resourceDependencies(input: { resourceId: string }): Promise<CloudDependencySummary> {
    return { resourceId: input.resourceId, dependsOn: [], dependedBy: [] };
  }
}
