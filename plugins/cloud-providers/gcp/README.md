# @ai-crew-suite/plugin-tool-cloud-providers-backend-module-gcp

> GCP Extension Module for the AI Crew Suite platform.

## Overview

This package implements the GCP specific integration module for the AI Crew Suite cloud providers framework. It registers the Google Cloud Platform concrete implementation of the `CloudProviderDriver` interface with the core plugin engine, translating high-level provider-neutral inventory and asset queries into targeted GCP SDK requests.

### Core Responsibilities

- **Backend module extension**: Wires into the `@ai-crew-suite/plugin-tool-cloud-providers-backend` extension points.
- **GCP driver implementation**: Implements the `CloudProviderDriver` interface to communicate directly with Google Cloud APIs (Cloud Asset Inventory, Resource Manager, etc.).
- **Dynamic asset mapping**: Translates GCP Asset Names, project hierarchies, and label metadata into normalized entities.
- **Config integration**: Resolves authentication and project settings via the global configuration.

## Configuration

Ensure that your `app-config.yaml` includes the structural parameters required to resolve authentication blocks for GCP:

```yaml
ai:
  integrations:
    cloudProviders:
      gcp:
        projectId: ai-crew-suite-production
        # Optional service account key path
        # keyFilename: ./secrets/gcp-credentials.json
```

This extension activates automatically when `defaultProvider` matches `gcp`, or when explicit GCP asset lookups are routed through the orchestration layers.

## Local Development Workflow

```bash
yarn install --refresh
yarn turbo run build --filter=@ai-crew-suite/plugin-tool-cloud-providers-backend-module-gcp
yarn turbo run lint --filter=@ai-crew-suite/plugin-tool-cloud-providers-backend-module-gcp
yarn turbo run test --filter=@ai-crew-suite/plugin-tool-cloud-providers-backend-module-gcp
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
