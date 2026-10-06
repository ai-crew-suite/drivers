# @ai-crew-suite/plugin-tool-quality-scorecards-backend-module-scorecards

> Core Developer Documentation for the AI Crew Suite platform.

## Overview

This backend module registers a Cortex-style Scorecards `QualityScorecardDriver` with the host plugin **`@ai-crew-suite/plugin-tool-quality-scorecards-backend`** through its exposed `qualityScorecardsDriversExtensionPoint`.

This package handles all direct communication with external scorecard service engines, mapping data attributes, assessing rule adherence metrics, and translating custom vendor payloads into stable models consumed by upstream workspace agents.

## Configuration

Incorporate the driver initialization parameters inside your platform instance's global `app-config.yaml` layout structure:

```yaml
ai:
  integrations:
    qualityScorecards:
      provider: scorecards
      scorecards:
        baseUrl: https://cortex.io
        apiToken: \${CORTEX_API_TOKEN}
```

### Security Strategy

The outgoing connection acts as a secure client against the configured Scorecards endpoint using header-based authorization. Ensure your provisioned API tokens strictly enforce granular, read-only scoping boundaries limited exclusively to the service entities and rule collections your agents need to audit.

## Installation

Register the module directly into your central Backstage system backend initialization framework entrypoint (`packages/backend/src/index.ts`):

```typescript
import { toolQualityScorecardsModuleScorecards } from '@ai-crew-suite/plugin-tool-quality-scorecards-backend-module-scorecards';

backend.add(toolQualityScorecardsModuleScorecards);
```

## Local Development Workflow

### 1. Prerequisites & Context

This workspace relies on the monorepo's shared **Yarn Plug'n'Play (PnP)** caching layout.

### 2. Installation & Builds

```bash
yarn install --refresh
yarn workspace @ai-crew-suite/plugin-tool-quality-scorecards-backend-module-scorecards build
```

### 3. Running Unit & Integration Tests

```bash
yarn workspace @ai-crew-suite/plugin-tool-quality-scorecards-backend-module-scorecards test
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.  
Licensed under the **Apache License, Version 2.0**.
