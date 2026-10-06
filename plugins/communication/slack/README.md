# @ai-crew-suite/plugin-tool-communication-backend-module-slack

> Slack Extension Module for the AI Crew Suite platform.

## Overview

This package registers a Slack `CommunicationDriver` implementation with the core `@ai-crew-suite/plugin-tool-communication-backend` engine through its `communicationDriversExtensionPoint`. This package exclusively owns the Slack Web API connections, credential processing, and payload response mapping, while the core module manages the universal tool execution layer.

### Core Responsibilities

- **Backend module extension**: Wires cleanly into the core communication backend extension points.
- **Slack client coordination**: Manages active connections utilizing official Slack Web Client APIs.
- **Message and history mapping**: Translates Slack-specific channel history blocks and message threads into normalized, provider-neutral outputs.
- **Scope validation**: Safely processes configuration parameters and ensures runtime tokens map to operational boundaries.

## Configuration

Ensure your `app-config.yaml` includes the structural parameters required to authenticate your Slack App:

```yaml
ai:
  integrations:
    communication:
      provider: slack
      slack:
        token: \${SLACK_BOT_TOKEN}
        workspaceDomain: my-org.slack.com
```

### Required Bot Token Scopes

Your registered Slack App must be provisioned with the following explicit scopes to perform lookups and message posting:

- `channels:read` & `groups:read`
- `channels:history` & `groups:history`
- `chat:write`

## Installation

Add the extension module directly to your modern Backstage backend system container:

```ts
backend.add(import('@ai-crew-suite/plugin-tool-communication-backend-module-slack'));
```

## Local Development Workflow

```bash
yarn install --refresh
yarn turbo run build --filter=@ai-crew-suite/plugin-tool-communication-backend-module-slack
yarn turbo run lint --filter=@ai-crew-suite/plugin-tool-communication-backend-module-slack
yarn turbo run test --filter=@ai-crew-suite/plugin-tool-communication-backend-module-slack
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
