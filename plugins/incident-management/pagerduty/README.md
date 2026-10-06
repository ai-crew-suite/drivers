# @ai-crew-suite/plugin-tool-incident-management-backend-module-pagerduty

> PagerDuty Extension Module for the AI Crew Suite platform.

## Overview

This package registers a PagerDuty `IncidentManagementDriver` implementation with the core `@ai-crew-suite/plugin-tool-incident-management-backend` engine through its `incidentManagementDriversExtensionPoint`. This package exclusively owns PagerDuty REST API v2 interactions, payload mapping, and header injection, while the core module manages the universal tool execution layer.

### Core Responsibilities

- **Backend module extension**: Wires cleanly into the core incident management backend extension points.
- **PagerDuty client coordination**: Manages active HTTPS communication using the official REST API v2 endpoints.
- **Dynamic filter resolution**: Intercepts high-level human-readable service filters and maps them to structural PagerDuty IDs prior to querying incidents.
- **Operation attribution**: Manages custom request context formatting, ensuring write operations conform to required user matching boundaries.

## Configuration

Ensure your `app-config.yaml` includes the structural parameters required to authenticate your PagerDuty engine:

```yaml
ai:
  integrations:
    incidentManagement:
      provider: pagerduty
      pagerduty:
        apiToken: \${PAGERDUTY_API_TOKEN}
        fromEmail: ai-crew-suite@my-org.com
```

### Authentication & Filters

- **Write Operations**: The `fromEmail` configuration must resolve to a valid user account. PagerDuty enforces the usage of a `From` header for change mutation logging; write tools like `incident.incident.annotate` fail immediately if this parameters file is absent.
- **Read Operations**: A read-only API key is sufficient for read-only tracking features.
- **Metadata Filters**: Both `service` and `team` parameters are supported. Service context uses an implicit metadata lookup hook to extract exact identifier hashes since the API filters on keys rather than string descriptions.

## Installation

Add the extension module directly to your modern Backstage backend system container:

```ts
backend.add(import('@ai-crew-suite/plugin-tool-incident-management-backend-module-pagerduty'));
```

## Local Development Workflow

```bash
yarn install --refresh
yarn turbo run build --filter=@ai-crew-suite/plugin-tool-incident-management-backend-module-pagerduty
yarn turbo run lint --filter=@ai-crew-suite/plugin-tool-incident-management-backend-module-pagerduty
yarn turbo run test --filter=@ai-crew-suite/plugin-tool-incident-management-backend-module-pagerduty
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
