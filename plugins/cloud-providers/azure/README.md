# @ai-crew-suite/plugin-tool-cloud-providers-backend-module-azure

> Azure Extension Module for the AI Crew Suite platform.

## Overview

This package implements the Azure specific integration module for the AI Crew Suite cloud providers framework. It registers the Azure concrete implementation of the `CloudProviderDriver` interface with the core plugin engine, translating high-level provider-neutral inventory and asset queries into targeted Azure SDK requests.

### Core Responsibilities

- **Backend module extension**: Wires into the `@ai-crew-suite/plugin-tool-cloud-providers-backend` extension points.
- **Azure driver implementation**: Implements the `CloudProviderDriver` interface to communicate directly with Azure APIs (Azure Resource Graph, Subscription client, etc.).
- **Dynamic asset mapping**: Translates Azure Resource IDs, subscriptions, and management group tags into normalized entities.
- **Config integration**: Resolves authentication and regional settings via the global configuration.

---

## Configuration

Ensure that your `app-config.yaml` includes the structural parameters required to resolve authentication blocks for Azure:

```yaml
ai:
  integrations:
    cloudProviders:
      azure:
        tenantId: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        subscriptionId: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

This extension activates automatically when `defaultProvider` matches `azure`, or when explicit Azure asset lookups are routed through the orchestration layers.

## Local Development Workflow

```bash
yarn install --refresh
yarn turbo run build --filter=@ai-crew-suite/plugin-tool-cloud-providers-backend-module-azure
yarn turbo run lint --filter=@ai-crew-suite/plugin-tool-cloud-providers-backend-module-azure
yarn turbo run test --filter=@ai-crew-suite/plugin-tool-cloud-providers-backend-module-azure
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
