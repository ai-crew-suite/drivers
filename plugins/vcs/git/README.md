# @ai-crew-suite/plugin-tools-vcs-backend-module-git

> Core Developer Documentation for the AI Crew Suite platform.

## Overview

This backend module registers a vanilla Git `VcsDriver` with the host plugin **`@ai-crew-suite/plugin-tools-vcs-backend`** through its exposed `vcsDriversExtensionPoint`.

This package provides native, platform-agnostic version control operations using raw Git execution hooks. It handles bare or local filesystem repository checks, branch tracking, diff computing, and commit logging without relying on SaaS platform vendor wrappers (such as GitHub or GitLab pull request extensions). It is ideal for on-premise setups, disconnected network workspaces, or simple direct branch operations.

## Configuration

Incorporate the driver initialization parameters inside your platform instance's global `app-config.yaml` layout structure:

```yaml
ai:
  integrations:
    vcs:
      provider: git
      git:
        repositoriesRoot: /var/lib/backstage/repositories
        privateKey: \${GIT_PRIVATE_SSH_KEY}
```

### Security Strategy

The outgoing connection executes shell actions or utilizes native isomorphic Git interfaces. Ensure your private SSH deployment keys are bound to highly strict read-only execution profiles on the underlying remote host, or ensure the local repository path targets enforce tight filesystem user-group access permissions matching your running Backstage process scope.

## Installation

Register the module directly into your central Backstage system backend initialization framework entrypoint (`packages/backend/src/index.ts`):

```typescript
import { toolVcsModuleGit } from '@ai-crew-suite/plugin-tools-vcs-backend-module-git';

backend.add(toolVcsModuleGit);
```

## Local Development Workflow

### 1. Prerequisites & Context

This workspace relies on the monorepo's shared **Yarn Plug'n'Play (PnP)** caching layout.

### 2. Installation & Builds

```bash
yarn install --refresh
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-git build
```

### 3. Running Unit & Integration Tests

```bash
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-git test
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.  
Licensed under the **Apache License, Version 2.0**.
