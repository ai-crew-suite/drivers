# @ai-crew-suite/plugin-tool-observability-backend-module-datadog

> Datadog Extension Module for the AI Crew Suite platform.

## Overview

This package registers a Datadog `ObservabilityDriver` implementation with the core `@ai-crew-suite/plugin-tool-observability-backend` engine through its `observabilityDriversExtensionPoint`. This package exclusively owns the Datadog API communication boundaries, credential handling, and structural data conversion workflows, while the core module manages the universal tool execution layer.

### Endpoint Mapping

| Contract Method | Datadog Endpoint Target |
| --- | --- |
| `queryMetrics` | `GET /api/v1/query` |
| `searchLogs` | `POST /api/v2/logs/events/search` |
| `searchTraces` | `POST /api/v2/spans/events/search` |
| `listDashboards` | `GET /api/v1/dashboard` |

## Configuration

Ensure your `app-config.yaml` includes the structural parameters required to authenticate your Datadog workspace endpoints:

```yaml
ai:
  integrations:
    observability:
      provider: datadog
      datadog:
        apiKey: \${DATADOG_API_KEY}
        applicationKey: \${DATADOG_APP_KEY}
        # Set for non-US1 environments (e.g., the EU region site):
        # apiBaseUrl: https://api.datadoghq.eu
        # appBaseUrl: https://app.datadoghq.eu
```

Both keys are strictly required. Datadog analytical read configurations reject connections carrying an API token alone. Ensure your application key is scoped to include the following explicit permissions:

* `logs_read_data`
* `apm_read`
* `dashboards_read`

## Query Windows & Normalization

To prevent unbounded resource consumption over metered APIs, every query window is restricted:

* **Default Window:** When `since` and `until` boundaries are omitted, the driver applies a strict 1-hour lookback constraint.
* **Validation:** Inverted or logically flawed ranges are caught and rejected prior to downstream transmission.
* **Timestamp Alignment:** Datadog returns metrics via millisecond epochs and trace span durations via nanosecond metrics. The driver normalizes both types down to the core platform's metric contract requirements (milliseconds and ISO-8601 strings).

## Installation

Add the extension module directly to your modern Backstage backend system container:

```ts
backend.add(import('@ai-crew-suite/plugin-tool-observability-backend-module-datadog'));
```

## Local Development Workflow

```bash
yarn install --refresh
yarn turbo run build --filter=@ai-crew-suite/plugin-tool-observability-backend-module-datadog
yarn turbo run lint --filter=@ai-crew-suite/plugin-tool-observability-backend-module-datadog
yarn turbo run test --filter=@ai-crew-suite/plugin-tool-observability-backend-module-datadog
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
