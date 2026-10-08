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

import { createBackend } from '@backstage/backend-defaults';
import type { BackendFeature } from '@backstage/backend-plugin-api';

type BackendFeatureModule = { default: BackendFeature };

const loadBackendFeature = (loader: Promise<unknown>) =>
  loader as Promise<BackendFeatureModule>;

const backend = createBackend();

backend.add(loadBackendFeature(import('@backstage/plugin-app-backend')));
backend.add(loadBackendFeature(import('@backstage/plugin-proxy-backend')));

// scaffolder plugin
backend.add(loadBackendFeature(import('@backstage/plugin-scaffolder-backend')));
backend.add(
  loadBackendFeature(import('@backstage/plugin-scaffolder-backend-module-github')),
);
backend.add(
  loadBackendFeature(import('@backstage/plugin-scaffolder-backend-module-notifications')),
);

// techdocs plugin
backend.add(loadBackendFeature(import('@backstage/plugin-techdocs-backend')));

// auth plugin
backend.add(loadBackendFeature(import('@backstage/plugin-auth-backend')));
// See https://backstage.io/docs/backend-system/building-backends/migrating#the-auth-plugin
backend.add(
  loadBackendFeature(import('@backstage/plugin-auth-backend-module-guest-provider')),
);
// See https://backstage.io/docs/auth/guest/provider

// catalog plugin
backend.add(loadBackendFeature(import('@backstage/plugin-catalog-backend')));
backend.add(
  loadBackendFeature(import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model')),
);

// See https://backstage.io/docs/features/software-catalog/configuration#subscribing-to-catalog-errors
backend.add(loadBackendFeature(import('@backstage/plugin-catalog-backend-module-logs')));

// permission plugin
backend.add(loadBackendFeature(import('@backstage/plugin-permission-backend')));
// See https://backstage.io/docs/permissions/getting-started for how to create your own permission policy
backend.add(
  loadBackendFeature(import('@backstage/plugin-permission-backend-module-allow-all-policy')),
);

// search plugin
backend.add(loadBackendFeature(import('@backstage/plugin-search-backend')));

// search engine
// See https://backstage.io/docs/features/search/search-engines
backend.add(loadBackendFeature(import('@backstage/plugin-search-backend-module-pg')));

// search collators
backend.add(loadBackendFeature(import('@backstage/plugin-search-backend-module-catalog')));
backend.add(loadBackendFeature(import('@backstage/plugin-search-backend-module-techdocs')));

// kubernetes plugin
backend.add(loadBackendFeature(import('@backstage/plugin-kubernetes-backend')));

// notifications and signals plugins
backend.add(loadBackendFeature(import('@backstage/plugin-notifications-backend')));
backend.add(loadBackendFeature(import('@backstage/plugin-signals-backend')));

// mcp actions plugin
backend.add(loadBackendFeature(import('@backstage/plugin-mcp-actions-backend')));

backend.start();
