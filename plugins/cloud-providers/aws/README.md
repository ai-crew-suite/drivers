# @ai-crew-suite/plugin-tool-cloud-providers-backend-module-aws

> AWS Extension Module for the AI Crew Suite platform.

## Overview

This package implements the AWS specific integration module for the AI Crew Suite cloud providers framework. It registers the AWS concrete implementation of the `CloudProviderDriver` interface with the core plugin engine, translating high-level provider-neutral inventory and asset queries into targeted AWS SDK requests.

### Core Responsibilities

- **Backend module extension**: Wires into the `@ai-crew-suite/plugin-tool-cloud-providers-backend` extension points.
- **AWS driver implementation**: Implements the `CloudProviderDriver` interface to communicate directly with AWS APIs (STS, Resource Groups Tagging API, Config, etc.).
- **Dynamic asset mapping**: Translates AWS ARN boundaries, accounts, and cross-resource tags into normalized entities.
- **Config integration**: Resolves authentication and regional settings via the global configuration.

## Configuration

Ensure that your `app-config.yaml` includes the structural parameters required to resolve authentication blocks for AWS:

```yaml
ai:
  integrations:
    cloudProviders:
      aws:
        region: us-east-1
        # Optional credentials profile configuration
        # profile: ai-crew-suite-dev
```

This extension activates automatically when `defaultProvider` matches `aws`, or when explicit AWS asset lookups are routed through the orchestration layers.

## Local Development Workflow

```bash
yarn install --refresh
yarn turbo run build --filter=@ai-crew-suite/plugin-tool-cloud-providers-backend-module-aws
yarn turbo run lint --filter=@ai-crew-suite/plugin-tool-cloud-providers-backend-module-aws
yarn turbo run test --filter=@ai-crew-suite/plugin-tool-cloud-providers-backend-module-aws
```

## Compliance and Licensing

Copyright © 2026 The AI Crew Suite Authors.
Licensed under the **Apache License, Version 2.0**.
