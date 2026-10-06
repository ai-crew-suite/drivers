# @ai-crew-suite/plugin-tools-vcs-backend-module-bitbucket

> Core Developer Documentation for the AI Crew Suite platform.

## Overview

This backend module registers a Bitbucket `VcsDriver` with the host plugin **`@ai-crew-suite/plugin-tools-vcs-backend`** through its exposed `vcsDriversExtensionPoint`.

This package handles all direct API communication channels with Bitbucket Cloud or Bitbucket Server endpoints. It handles repository interaction tasks such as checking out source code states, tracking pull request reviewer tasks, resolving commit trees, and mapping metadata. It normalizes Bitbucket-specific response shapes into stable interfaces for version control agents.

## Configuration

Incorporate the driver initialization parameters inside your platform instance's global `app-config.yaml` layout structure:

```yaml
ai:
  integrations:
    vcs:
      provider: bitbucket
      bitbucket:
        baseUrl: https://bitbucket.org
        username: \${BITBUCKET_USERNAME}
        appPassword: \${BITBUCKET_APP_PASSWORD}
        workspace: my-company-workspace
```

### Security Strategy

The outbound connection relies on secure HTTP Basic Authentication using a Bitbucket **App Password** or OAuth credentials. Ensure your provisioned App Passwords enforce strict, least-privilege scoping guidelines (e.g., limiting permissions strictly to `Repositories (Read)` or `Pull Requests (Read & Write)`) scoped exclusively to the specific repository workspaces your platform agents require access to.

## Installation

Register the module directly into your central Backstage system backend initialization framework entrypoint (`packages/backend/src/index.ts`):

```typescript
import { toolVcsModuleBitbucket } from '@ai-crew-suite/plugin-tools-vcs-backend-module-bitbucket';

backend.add(toolVcsModuleBitbucket);
```

## Local Development Workflow

### 1. Prerequisites & Context

This workspace relies on the monorepo's shared **Yarn Plug'n'Play (PnP)** caching layout.

### 2. Installation & Builds

```bash
yarn install --refresh
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-bitbucket build
```

### 3. Running Unit & Integration Tests

```bash
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-bitbucket test
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.  
Licensed under the **Apache License, Version 2.0**.
