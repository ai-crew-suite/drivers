# @ai-crew-suite/plugin-tool-compliance-backend

> Core Developer Documentation for the AI Crew Suite platform.

## Overview

This package is the **core module for the compliance integration group**. It owns the provider-neutral compliance contract and tool surface, and resolves a concrete vendor driver that a sibling extension package registers through an extension point at boot time. It contains no vendor code and no vendor dependencies.

### Core Responsibilities

- **Backend module registration**: Registers `aiCoreBackendModuleCompliance` as an `ai-core` backend module using `createBackendModule`.
- **Extension point**: Exposes `complianceDriversExtensionPoint` so sibling modules can register `ComplianceDriver` implementations.
- **Driver resolution**: Selects the active driver from the runtime registry using `ai.integrations.compliance.provider`.
- **Stable tool registration**: Registers `compliance.policy.evaluate`, `compliance.permission.check`, `compliance.architecture.validate`, and `compliance.cost.estimate` through the system tool extension points.

## Available Driver Modules

| Package | Driver ID |
| --- | --- |
| `@ai-crew-suite/plugin-tool-compliance-backend-module-opa` | `opa` |

## Configuration

This package owns only the driver selector. Connection details and policy paths are owned by the sibling driver packages.

```yaml
ai:
  integrations:
    compliance:
      provider: opa
```

Install the core module alongside the driver module you selected:

```ts
backend.add(import('@ai-crew-suite/plugin-tool-compliance-backend'));
backend.add(import('@ai-crew-suite/plugin-tool-compliance-backend-module-opa'));
```

Boot fails with an explicit error when the selected identifier has no registered driver.

## Authoring a New Driver Module

1. Create a workspace directory under `plugins/tools/compliance/<provider>`.
2. Implement `ComplianceDriver` from `@ai-crew-suite/plugin-tool-compliance-backend` (or its shared node types).
3. Depend on `complianceDriversExtensionPoint` in `createBackendModule` and call `registerDriver` during initialization.
4. Own `ai.integrations.compliance.<provider>` in your package's `config.d.ts`.

## Local Development Workflow

```bash
yarn install --refresh
yarn turbo run build --filter=@ai-crew-suite/plugin-tool-compliance-backend
yarn turbo run lint --filter=@ai-crew-suite/plugin-tool-compliance-backend
yarn turbo run test --filter=@ai-crew-suite/plugin-tool-compliance-backend
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
