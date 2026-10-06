# @ai-crew-suite/plugin-tools-vcs-backend-module-gerrit

> Core Developer Documentation for the AI Crew Suite platform.

## Overview

This backend module registers a Gerrit Code Review `VcsDriver` with the host plugin **`@ai-crew-suite/plugin-tools-vcs-backend`** through its exposed `vcsDriversExtensionPoint`.

This package handles all direct communication channels with Gerrit REST and SSH API endpoints. It manages core review ecosystem tasks such as inspecting change sets, polling open reviews, fetching inline code comment histories, and posting automated scoring approvals or review feedback. It normalizes Gerrit's change-set models into vendor-neutral structures consumed by upstream agents.

## Configuration

Incorporate the driver initialization parameters inside your platform instance's global `app-config.yaml` layout structure:

```yaml
ai:
  integrations:
    vcs:
      provider: gerrit
      gerrit:
        baseUrl: https://example.com
        username: \${GERRIT_USERNAME}
        httpPassword: \${GERRIT_HTTP_PASSWORD}
```

### Security Strategy

The outgoing connection acts as a secure client leveraging authenticated HTTP digest/basic or SSH credential wrappers. Ensure your provisioned Gerrit system accounts or HTTP passwords strictly enforce granular, least-privilege project access constraints (e.g., restricted stream read access and localized verified-label scoring privileges) limited exclusively to the codebase targets your active workspace agents need to audit.

## Installation

Register the module directly into your central Backstage system backend initialization framework entrypoint (`packages/backend/src/index.ts`):

```typescript
import { toolVcsModuleGerrit } from '@ai-crew-suite/plugin-tools-vcs-backend-module-gerrit';

backend.add(toolVcsModuleGerrit);
```

## Local Development Workflow

### 1. Prerequisites & Context

This workspace relies on the monorepo's shared **Yarn Plug'n'Play (PnP)** caching layout.

### 2. Installation & Builds

```bash
yarn install --refresh
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-gerrit build
```

### 3. Running Unit & Integration Tests

```bash
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-gerrit test
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.  
Licensed under the **Apache License, Version 2.0**.
