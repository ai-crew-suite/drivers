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
import { ProjectsClient } from '@google-cloud/resource-manager';
import { Config } from '@backstage/config';
import {
  CloudProviderDriver,
  CloudAccountSummary,
  CloudResourceSummary,
  CloudDependencySummary
} from '@ai-crew-suite/plugin-kernel-node';

/**
 * Isolated parameters required to instantiate the concrete Google Cloud Provider adapter.
 * Managed entirely within the scope of this provider module package.
 */
export interface GcpDriverOptions {
  logger: any;
  rootConfig: Config;
  config: { region: string };
}

export class GcpDriver implements CloudProviderDriver {
  readonly providerId = 'gcp';
  private readonly logger: any;
  private readonly rootConfig: Config;
  private readonly region: string;

  constructor(options: GcpDriverOptions) {
    this.logger = options.logger;
    this.rootConfig = options.rootConfig;
    this.region = options.config.region;
  }

  private getProjectId(): string {
    const gcpIntegration = this.rootConfig.getOptionalConfig('integrations.gcp');
    return gcpIntegration?.getOptionalString('projectId') || process.env['GOOGLE_CLOUD_PROJECT'] || 'unknown-project';
  }

  async lookupAccount(): Promise<CloudAccountSummary | undefined> {
    const projectId = this.getProjectId();
    this.logger.debug(`Mapping Google Cloud project context for project: ${projectId}`);

    return {
      id: projectId,
      name: 'GCP Active Project Context',
      provider: this.providerId,
      region: this.region,
    };
  }

  async lookupResource(input: { service?: string; tags?: Record<string, string> }): Promise<CloudResourceSummary[]> {
    const projectId = this.getProjectId();
    this.logger.debug(`Polling GCP Resource Management API for resource descriptors under project: ${projectId}`);

    try {
      const client = new ProjectsClient();
      const summaries: CloudResourceSummary[] = [];

      // Fetch the specific root project resource to evaluate metadata labels
      const [project] = await client.getProject({ name: `projects/${projectId}` });
      const labels = project.labels || {};

      // Filter by requested tag boundaries if provided
      if (input.tags) {
        const match = Object.entries(input.tags).every(([k, v]) => labels[k] === v);
        if (!match) return [];
      }

      // Format the root project asset footprint into standard contracts
      summaries.push({
        id: project.name || `projects/${projectId}`,
        // FIXED BUG: Ensured literal string fallbacks conform cleanly to the structural contract
        type: input.service || 'cloud.project',
        provider: this.providerId,
        region: this.region,
        tags: labels,
        owner: labels['owner'] || labels['team'],
        catalogEntityRef: labels['backstage.io/component'] || labels['backstage-io-component'],
      });

      return summaries;
    } catch (err: any) {
      this.logger.error(`Error gathering live GCP asset tracking topology matrix: ${err.message}`);
      throw err;
    }
  }

  async resourceDependencies(input: { resourceId: string }): Promise<CloudDependencySummary> {
    return { resourceId: input.resourceId, dependsOn: [], dependedBy: [] };
  }
}
