# @ai-crew-suite/plugin-tool-quality-scorecards-backend-module-techradar

> Core Developer Documentation for the AI Crew Suite platform.

## Overview

This backend module registers a TechRadar `QualityScorecardDriver` with the host plugin **`@ai-crew-suite/plugin-tool-quality-scorecards-backend`** through its exposed `qualityScorecardsDriversExtensionPoint`.

This package handles all direct data extraction from Tech Radar definitions, mapping Ring positioning (e.g., Adopt, Trial, Assess, Hold) and quadrant assignments, and transforming specific entity engineering maturity data into format matrices for upstream execution agents.

## Configuration

Incorporate the driver initialization parameters inside your platform instance's global `app-config.yaml` layout structure:

```yaml
ai:
  integrations:
    qualityScorecards:
      provider: techradar
      techradar:
        baseUrl: https://techradar.example.com
```

### Security Strategy

The connection operates as an internal or external client targeting your Tech Radar definition engine. Ensure that underlying data loaders restrict write or mutation boundaries if agents only require read-only clearance to cross-reference organizational engineering choices against active code assets.

## Installation

Register the module directly into your central Backstage system backend initialization framework entrypoint (`packages/backend/src/index.ts`):

```typescript
import { toolQualityScorecardsModuleTechradar } from '@ai-crew-suite/plugin-tool-quality-scorecards-backend-module-techradar';

backend.add(toolQualityScorecardsModuleTechradar);
```

## Local Development Workflow

### 1. Prerequisites & Context

This workspace relies on the monorepo's shared **Yarn Plug'n'Play (PnP)** caching layout.

### 2. Installation & Builds

```bash
yarn install --refresh
yarn workspace @ai-crew-suite/plugin-tool-quality-scorecards-backend-module-techradar build
```

### 3. Running Unit & Integration Tests

```bash
yarn workspace @ai-crew-suite/plugin-tool-quality-scorecards-backend-module-techradar test
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.  
Licensed under the **Apache License, Version 2.0**.
