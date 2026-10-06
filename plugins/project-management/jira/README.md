# @ai-crew-suite/plugin-tool-project-management-backend-module-jira

> Core Developer Documentation for the AI Crew Suite platform.

## Overview

This backend module registers a Jira Cloud `ProjectManagementDriver` with the host plugin **`@ai-crew-suite/plugin-tool-project-management-backend`** through its exposed `projectManagementDriversExtensionPoint`. 

This package handles all direct Jira REST API connection cycles, payload marshaling, authentication overhead, and response-mapping tasks. The tool layer itself remains abstractly managed by the core host backend package.

## Configuration

Incorporate the driver initialization parameters inside your platform instance's global `app-config.yaml` layout structure:

```yaml
ai:
  integrations:
    projectManagement:
      provider: jira
      jira:
        baseUrl: https://my-org.atlassian.net
        email: \${JIRA_EMAIL}
        apiToken: \${JIRA_API_TOKEN}
        defaultProjectKey: OPS
        defaultIssueType: Task
```

### Security Strategy

The outgoing API connection utilizes **HTTP Basic Authentication** mechanisms directed against the secure **Jira Cloud REST API v3** endpoint ecosystem. Ensure your provisioned API tokens strictly enforce granular, least-privilege scoping rules limited exclusively to the specific project boundaries required by your active workspace agents.

## Installation

Register the module directly into your central Backstage system backend initialization framework entrypoint (`packages/backend/src/index.ts`):

```typescript
import { toolProjectManagementModuleJira } from '@ai-crew-suite/plugin-tool-project-management-backend-module-jira';

backend.add(toolProjectManagementModuleJira);
```

## Local Development Workflow

### 1. Prerequisites & Context

This workspace relies on the monorepo's shared **Yarn Plug'n'Play (PnP)** caching layout.

### 2. Installation & Builds

```bash
yarn install --refresh
yarn workspace @ai-crew-suite/plugin-tool-project-management-backend-module-jira build
```

### 3. Running Unit & Integration Tests

```bash
yarn workspace @ai-crew-suite/plugin-tool-project-management-backend-module-jira test
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.  
Licensed under the **Apache License, Version 2.0**.
