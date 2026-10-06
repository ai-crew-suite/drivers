# @ai-crew-suite/plugin-tools-vcs-backend-module-azure

> Core Developer Documentation for the AI Crew Suite platform.

## Overview

This backend module registers an Azure DevOps `VcsDriver` with the host plugin **`@ai-crew-suite/plugin-tools-vcs-backend`** through its exposed `vcsDriversExtensionPoint`.

This package handles all direct API handshakes with Azure DevOps Services and Server endpoints, managing version control tasks such as pull request lifecycles, branch inspections, commit delta parsing, and repository structure tree resolution. It transforms Azure-specific JSON payloads into vendor-neutral structures consumed by upstream agents.

## Configuration

Incorporate the driver initialization parameters inside your platform instance's global `app-config.yaml` layout structure:

```yaml
ai:
  integrations:
    vcs:
      provider: azure
      azure:
        baseUrl: https://azure.com
        token: \${AZURE_DEVOPS_TOKEN}
        defaultProject: CoreEngine
```

### Security Strategy

The outgoing connection communicates securely with the Azure DevOps REST API via Personal Access Tokens (PAT) using HTTP Basic Authentication mechanisms. Ensure your provisioned PAT tokens strictly enforce granular, minimal scopes (such as `Code (Read & Write)`) restricted to the exact project collections your active workspace agents need to audit or mutate.

## Installation

Register the module directly into your central Backstage system backend initialization framework entrypoint (`packages/backend/src/index.ts`):

```typescript
import { toolVcsModuleAzure } from '@ai-crew-suite/plugin-tools-vcs-backend-module-azure';

backend.add(toolVcsModuleAzure);
```

## Local Development Workflow

### 1. Prerequisites & Context

This workspace relies on the monorepo's shared **Yarn Plug'n'Play (PnP)** caching layout.

### 2. Installation & Builds

```bash
yarn install --refresh
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-azure build
```

### 3. Running Unit & Integration Tests

```bash
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-azure test
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.  
Licensed under the **Apache License, Version 2.0**.
