# @ai-crew-suite/plugin-tools-vcs-backend-module-gitlab

> Core Developer Documentation for the AI Crew Suite platform.

## Overview

This backend module registers a GitLab `VcsDriver` with the host plugin **`@ai-crew-suite/plugin-tools-vcs-backend`** through its exposed `vcsDriversExtensionPoint`.

This package targets both GitLab SaaS and Self-Managed instances, handling connection routing to the platform's native REST and GraphQL API structures. It manages version control tasks such as scanning repository trees, evaluating Merge Requests (MR), appending automated review discussions, checking pipeline statuses, and dispatching code branch mutations. It normalizes GitLab-specific response structures into stable types consumed by upstream platform agents.

## Configuration

Incorporate the driver initialization parameters inside your platform instance's global `app-config.yaml` layout structure:

```yaml
ai:
  integrations:
    vcs:
      provider: gitlab
      gitlab:
        baseUrl: https://gitlab.com
        token: \${GITLAB_TOKEN}
```

### Security Strategy

The outgoing connection communicates securely with the GitLab API via Personal Access Tokens, Project Access Tokens, or OAuth tokens using private token or bearer headers. Ensure your token configurations strictly adhere to least-privilege scoping structures (e.g., restricting access solely to `read_repository` or `api` for automated merge review actions) limited to the target codebase groups your agents are authorized to track.

## Installation

Register the module directly into your central Backstage system backend initialization framework entrypoint (`packages/backend/src/index.ts`):

```typescript
import { toolVcsModuleGitlab } from '@ai-crew-suite/plugin-tools-vcs-backend-module-gitlab';

backend.add(toolVcsModuleGitlab);
```

## Local Development Workflow

### 1. Prerequisites & Context

This workspace relies on the monorepo's shared **Yarn Plug'n'Play (PnP)** caching layout.

### 2. Installation & Builds

```bash
yarn install --refresh
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-gitlab build
```

### 3. Running Unit & Integration Tests

```bash
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-gitlab test
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.  
Licensed under the **Apache License, Version 2.0**.
