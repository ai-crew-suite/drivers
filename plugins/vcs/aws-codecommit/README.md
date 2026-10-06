# @ai-crew-suite/plugin-tools-vcs-backend-module-aws-codecommit

> Core Developer Documentation for the AI Crew Suite platform.

## Overview

This backend module registers an AWS CodeCommit `VcsDriver` with the host plugin **`@ai-crew-suite/plugin-tools-vcs-backend`** through its exposed `vcsDriversExtensionPoint`.

This package handles all direct API handshakes with AWS CodeCommit endpoints, managing operations like repository cloning context, pull request creation, commit analysis, and repository metadata mapping. It normalizes AWS-specific response models into standard structures consumed by upstream version control agents.

## Configuration

Incorporate the driver initialization parameters inside your platform instance's global `app-config.yaml` layout structure:

```yaml
ai:
  integrations:
    vcs:
      provider: aws-codecommit
      aws-codecommit:
        region: us-east-1
        credentials:
          accessKeyId: \${AWS_ACCESS_KEY_ID}
          secretAccessKey: \${AWS_SECRET_ACCESS_KEY}
```

### Security Strategy

The outgoing connection acts as a secure client leveraging the official AWS SDK mechanisms. Ensure your IAM roles or access keys strictly enforce granular, least-privilege scoping rules (e.g., restricted `codecommit:GitPull`, `codecommit:GitPush`, and `codecommit:Get*` actions) limited exclusively to the specific repository boundaries your active workspace agents need to interact with.

## Installation

Register the module directly into your central Backstage system backend initialization framework entrypoint (`packages/backend/src/index.ts`):

```typescript
import { toolVcsModuleAwsCodecommit } from '@ai-crew-suite/plugin-tools-vcs-backend-module-aws-codecommit';

backend.add(toolVcsModuleAwsCodecommit);
```

## Local Development Workflow

### 1. Prerequisites & Context

This workspace relies on the monorepo's shared **Yarn Plug'n'Play (PnP)** caching layout.

### 2. Installation & Builds

```bash
yarn install --refresh
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-aws-codecommit build
```

### 3. Running Unit & Integration Tests

```bash
yarn workspace @ai-crew-suite/plugin-tools-vcs-backend-module-aws-codecommit test
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.  
Licensed under the **Apache License, Version 2.0**.
