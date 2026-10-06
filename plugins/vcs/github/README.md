# @ai-crew-suite/plugin-tools-vcs-backend-module-github

> Core Developer Documentation for the AI Crew Suite platform.

## Overview

This backend module registers a GitHub `VcsDriver` with the host plugin **`@ai-crew-suite/plugin-tools-vcs-backend`** through its exposed `vcsDriversExtensionPoint`.

This package targets both GitHub SaaS and GitHub Enterprise Server instances, handling the platform's native REST and GraphQL integrations. It manages version control tasks such as reading repository structures, auditing Pull Request lines, posting automated code-review commentary, processing commit histories, and modifying code branch states. It maps GitHub-specific responses into the standardized data interfaces required by your upstream agents.

## Configuration

Incorporate the driver initialization parameters inside your platform instance's global `app-config.yaml` layout structure:

```yaml
ai:
  integrations:
    vcs:
      provider: github
      github:
        baseUrl: https://github.com
        token: \${GITHUB_TOKEN}
        enterpriseInstance: false
```

### Security Strategy

The outgoing connection communicates securely with the GitHub API ecosystem via Personal Access Tokens (PAT) or GitHub App installations using Bearer authorization headers. Ensure your token configurations strictly adhere to least-privilege scoping structures (e.g., restricting access solely to `repo` or granular fine-grained repository `contents:read`, `pull_requests:write` scopes) limited to the target codebase code assets your agents are authorized to track.

## Installation

Register the module directly into your central Backstage system backend initialization framework entrypoint (`packages/backend/src/index.ts`):

```typescript
import { toolVcsModuleGithub } from '@ai-crew-suite/plugin-tools-vcs-backend-module-github';

backend.add(toolVcsModuleGithub);
```

## Local Development Workflow

### 1. Prerequisites & Context

This workspace relies on the monorepo's shared **Yarn Plug'n'Play (PnP)** caching layout.

### 2. Installation & Builds

```bash
yarn install --refresh
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-github build
```

### 3. Running Unit & Integration Tests

```bash
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-github test
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.  
Licensed under the **Apache License, Version 2.0**.
