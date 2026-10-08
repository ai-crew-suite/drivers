# AI Crew Suite — Monorepo Architecture Guide

Welcome to the **AI Crew Suite** monorepo. This project uses a **Turborepo** monorepo workspace structure to manage our agentic workflow plugins, core orchestration services, and tool abstractions. 

This document defines our hard standards for directory layouts, package naming conventions, and architectural boundaries.

## 🏗️ Architectural Foundations

Our monorepo splits code into three isolated tiers:

1. **Core Orchestration & Infra:** The underlying LangGraph workflow engine, shared Node runtimes, and foundational infrastructure drivers (LLMs, Vector Storage).
2. **Agents:** End-user facing agent workflows, paired cleanly into frontend and backend packages.
3. **Tools:** Standardized interfaces allowing our agents to communicate with third-party software (VCS, Project Management, Slack).

All internal packages belong to the NPM organization scope `@ai-crew-suite`.

## `role` Key Values in `package.json` `backstage` block

- **`backend-plugin`**: An isolated backend plugin that registers entirely new API routes and logic controllers (e.g., your primary observability plugin system).
- **`backend-plugin-module`**: An extension package targeting an existing backend plugin (e.g., adding Datadog capability to your observability plugin).
- **`frontend-plugin`**: A UI plugin delivering cards, pages, or components to the Backstage UI.
- **`frontend-plugin-module`**: An extension targeting a frontend plugin (e.g., adding a specific widget variant to a catalog dashboard).
- **`node-library`**: Shared backend code/utilities that use Node APIs (but aren't standalone plugins).
- **`web-library`**: Shared frontend utilities (components, hooks, helpers).
- **`common-library`**: Completely platform-agnostic code (like shared TypeScript types) used by both frontend and backend.

## Correcting Your Architectural Drift

### The `web-library` with `api/index.ts`

- **The Verdict:** **It is organized correctly.**
- **Why:** A `web-library` is strictly for frontend/browser code (React components, frontend utility hooks). It should *never* import from `@backstage/backend-plugin-api`. If it needs Backstage types, it should import from `@backstage/core-plugin-api` or `@backstage/core-components`.

### The Vector Store/Retrieval Augmenter Plugins

- **The Verdict:** **Change their role to `node-library`.**
- **Why:** If a backend package doesn't use `createBackendPlugin` or expose its own API routes directly to the Backstage router, it isn't a standalone `backend-plugin`. It is an infrastructure utility layer. Changing their role to `node-library` ensures they bundle cleanly as a backend dependency for other plugins.

### The Runtime Store Plugin

- **The Verdict:** **Change its role to `backend-plugin-module` OR switch its code to `createBackendPlugin`.**
- **Why:** This is a direct mismatch. If it uses `createBackendModule`, its role *must* be `backend-plugin-module`, and it must hook into a target `pluginId`. If it is meant to stand alone as its own independent service, its code must be refactored to use `createBackendPlugin`.

### The 8 "Engine + Provider" Hubs (e.g., Jira, GitHub)

- **The Verdict:** **The Engine must be a `backend-plugin` (using `createBackendPlugin`). The Providers are correct as `backend-plugin-module` (using `createBackendModule`).**
- **Why:** The Engine is the central brain. It must initialize the main plugin and expose an `ExtensionPoint` (via `createExtensionPoint`). The Provider modules then depend on that Engine and register themselves *into* that engine's extension point. The engine should **never** use `createBackendModule`.

### The 18 Feature Pairs

- **The Verdict:** **The Backends are misconfigured. Change them to use `createBackendPlugin`.**
- **Why:** If they have a role of `backend-plugin`, they must use `createBackendPlugin` so they can stand alone. Using `createBackendModule` means they are trying to attach themselves to a different plugin, which defeats the purpose of them being independent feature backends.

## How Roles Affect `moduleId` Standards

The role you choose dramatically impacts how Backstage expects you to structure your code, and directly mandates the standards for your `moduleId`.

### Only `*-module` Roles Allow a `moduleId`

If a package's role is `backend-plugin`, **it cannot have a `moduleId`**. Only `backend-plugin-module` packages can expose a `moduleId`. If you are creating a package that houses 4 different drivers (Datadog, New Relic, Prometheus) inside one single package, that package's role is `backend-plugin`, and you will instantiate each module internally without the package tracking individual `moduleIds`.

## Match the Export Variable Name to the `moduleId` IDs

`backend-plugin-module` role:

> `<pluginId>Module<moduleId>` (in camelCase)

`backend-plugin` role:

> ``<pluginId>Plugin` (converted to camelCase)

## Leaf Plugin Files

```bash
find . -type f -exec sed -i 's|https://github.com/ai-crew-suite|https://github.com/ai-crew-suite|g' {} +
```

### `tsconfig.json`

```json
{
  "extends": "../../../../tsconfig.base.json",
}
```

```bash
@ai-crew-suite/plugin-kernel-node
```

### `package.json`

```json
  "configSchema": "config.d.ts",

{
  "name": "@ai-crew-suite/agent-alert-tuner-backend",
  "description": "",
  "version": "0.0.1",
  "type": "module", // frontend plugins only
  "main": "src/index.ts",
  "types": "src/index.ts",
  "license": "Apache-2.0",
  "keywords": [
    "agentic workflow",
    "ai-crew-suite",
    "backend-plugin",
    "backstage"
  ],
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "backstage": {
    "role": "backend-plugin",
    "pluginId": "",
    "pluginPackages": [
      "",
      ""
    ]
  },
  "bugs": {
    "url": "https://github.com/ai-crew-suite/drivers/issues",
    "email": "support@ai-crew-suite.dev"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/ai-crew-suite/drivers",
    "directory": ""
  },
  "files": [
    "dist/",
    "config.d.ts"
  ],
  "scripts": {
    "build": "crew build",
    "clean": "crew clean",
    "lint": "crew lint",
    "test:e2e": "crew test:e2e",
    "test:unit": "crew test:unit",
    "test:unit:coverage": "crew test:unit:coverage",
    "typecheck": "crew typecheck"
  },
  "dependencies": {
    "@ai-crew-suite/plugin-kernel-node": "workspace:^",
    "@backstage/backend-plugin-api": "backstage:^",
    "@backstage/config": "backstage:^",
  },
  "devDependencies": {
    "@ai-crew-suite/cli": "catalog:dev",
    "vitest": "catalog:dev"
  }
}
```

### Run Unit Tests in a Plugin

```bash
yarn turbo run build --filter=@ai-crew-suite/eslint
yarn turbo run lint --filter=@ai-crew-suite/eslint
yarn turbo run test:unit --filter=@ai-crew-suite/eslint
```

When team members join or when you start creating new internal Backstage plugins, the workflow for a new feature branch will look like this:

```bash
# 1. Create a dedicated task branch
git checkout -b feature/my-new-backstage-plugin

# 2. Write your code, tests, and run validations locally
crew typecheck && crew test:unit && crew lint

# 3. When you are ready to commit a release target intent, generate a changeset file
yarn changeset
```

Would you like to set up the **GitHub Actions setup file validation** for your `Changeset PRs` pull request creation workflow next?

## 📁 Repository Directory Structure

```text
ai-crew-suite/
├── plugins/
│   ├── kernel/
│   │   ├── backend/                        # @ai-crew-suite/plugin-kernel-backend
│   │   ├── node/                           # @ai-crew-suite/plugin-kernel-node
│   │   ├── llm/
│   │   │   ├── aws/                        # @ai-crew-suite/plugin-ai-providers-backend-module-aws
│   │   │   ├── openai/                     # @ai-crew-suite/plugin-ai-providers-backend-module-openai
│   │   │   └── openrouter/                 # @ai-crew-suite/plugin-ai-providers-backend-module-openrouter
│   │   ├── vector-store/
│   │   │   ├── pgvector/                   # @ai-crew-suite/plugin-vector-store-pgvector
│   │   │   └── qdrant/                     # @ai-crew-suite/plugin-vector-store-qdrant
│   │   ├── react/                          # @ai-crew-suite/plugin-kernel-react
│   │   ├── retrieval-augmenter/            # @ai-crew-suite/plugin-retrieval-augmenter-backend
│   │   └── runtime-store/                  # @ai-crew-suite/plugin-databases-runtime-backend
│   │
│   ├── agents/
│   │   ├── alert-tuner/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-alert-tuner-backend-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-alert-tuner-backend
│   │   ├── catalog-insights/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-catalog-insights-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-catalog-insights
│   │   ├── kubernetes-responder/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-kubernetes-responder-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-kubernetes-responder
│   │   ├── oncall-handover/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-oncall-handover-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-oncall-handover
│   │   ├── release-notes-generator/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-release-notes-generator-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-release-notes-generator
│   │   ├── rfc-adr-reviewer/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-rfc-adr-reviewer-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-rfc-adr-reviewer
│   │   ├── scaffolder-drift-detector/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-scaffolder-drift-detector-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-scaffolder-drift-detector
│   │   ├── scaffolder-guardrail/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-scaffolder-guardrail-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-scaffolder-guardrail
│   │   ├── scaffolder-infra/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-scaffolder-infra-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-scaffolder-infra
│   │   ├── scaffolder-intent/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-scaffolder-intent-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-scaffolder-intent
│   │   ├── scaffolder-prd/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-scaffolder-prd-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-scaffolder-prd
│   │   ├── scaffolder-shadow-detective/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-scaffolder-shadow-detective-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-scaffolder-shadow-detective
│   │   ├── search-archeology/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-search-archeology-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-search-archeology
│   │   ├── search-context/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-search-context-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-search-context
│   │   ├── tech-debt-scout/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-tech-debt-scout-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-tech-debt-scout
│   │   ├── techdocs-janitor/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-techdocs-janitor-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-techdocs-janitor
│   │   ├── techdocs-postmortem/
│   │   │   ├── backend/                    # @ai-crew-suite/plugin-agent-techdocs-postmortem-backend
│   │   │   └── react/                      # @ai-crew-suite/plugin-agent-techdocs-postmortem
│   │   └── tech-radar-manager/
│   │       ├── backend/                    # @ai-crew-suite/plugin-agent-tech-radar-manager-backend
│   │       └── react/                      # @ai-crew-suite/plugin-agent-tech-radar-manager
│   │
│   └── tools/
│       ├── cloud-providers/
│       │   ├── engine/                     # @ai-crew-suite/plugin-tool-cloud-providers-backend
│       │   ├── aws/                        # @ai-crew-suite/plugin-tool-cloud-providers-backend-module-aws
│       │   ├── azure/                      # @ai-crew-suite/plugin-tool-cloud-providers-backend-module-azure
│       │   └── gcp/                        # @ai-crew-suite/plugin-tool-cloud-providers-backend-module-gcp
│       ├── communication/
│       │   ├── engine/                     # @ai-crew-suite/plugin-tool-communication-backend
│       │   └── slack/                      # @ai-crew-suite/plugin-tool-communication-backend-module-slack
│       ├── compliance/
│       │   ├── engine/                     # @ai-crew-suite/plugin-tool-compliance-backend
│       │   └── opa/                        # @ai-crew-suite/plugin-tool-compliance-backend-module-opa
│       ├── incident-management/
│       │   ├── engine/                     # @ai-crew-suite/plugin-tool-incident-management-backend
│       │   └── pagerduty/                  # @ai-crew-suite/plugin-tool-incident-management-backend-module-pagerduty
│       ├── kubernetes/                     # @ai-crew-suite/plugin-tool-kubernetes-backend
│       ├── observability/
│       │   ├── engine/                     # @ai-crew-suite/plugin-tool-observability-backend
│       │   └── datadog/                    # @ai-crew-suite/plugin-tool-observability-backend-module-datadog
│       ├── project-management/
│       │   ├── engine/                     # @ai-crew-suite/plugin-tool-project-management-backend
│       │   └── jira/                       # @ai-crew-suite/plugin-tool-project-management-backend-module-jira
│       ├── quality-scorecards/
│       │   ├── engine/                     # @ai-crew-suite/plugin-tool-quality-scorecards-backend
│       │   ├── scorecards/                 # @ai-crew-suite/plugin-tool-quality-scorecards-backend-module-scorecards
│       │   ├── soundcheck/                 # @ai-crew-suite/plugin-tool-quality-scorecards-backend-module-soundcheck
│       │   └── techradar/                  # @ai-crew-suite/plugin-tool-quality-scorecards-backend-module-techradar
│       └── vcs/
│           ├── engine/                     # @ai-crew-suite/plugin-tools-vcs-backend
│           ├── aws-codecommit/             # @ai-crew-suite/plugin-tools-vcs-backend-module-aws-codecommit
│           ├── azure/                      # @ai-crew-suite/plugin-tools-vcs-backend-module-azure
│           ├── bitbucket/                  # @ai-crew-suite/plugin-tools-vcs-backend-module-bitbucket
│           ├── gerrit/                     # @ai-crew-suite/plugin-tools-vcs-backend-module-gerrit
│           ├── git/                        # @ai-crew-suite/plugin-tools-vcs-backend-module-git
│           ├── github/                     # @ai-crew-suite/plugin-tools-vcs-backend-module-github
│           └── gitlab/                     # @ai-crew-suite/plugin-tools-vcs-backend-module-gitlab
│
├── package.json                            # Root monorepo metadata
└── turbo.json                              # Pipelines orchestration profile

```

## 🏷️ Package Naming Conventions

To keep our workspace clean and highly predictable, all package.json names must rigidly follow these prefixes and rules:

### 1. Agents (Workflow Plugins)

Every agent consists of a co-located frontend and backend folder under `plugins/agents/[domain]`.

* **Pattern:** `@ai-crew-suite/agent-[domain]-[purpose]-[backend|frontend]`
* **Rules:** Eliminate any redundant use of ai in the purpose string.
* *Example:* `@ai-crew-suite/agent-alert-tuner-backend`

### 2. Tools & Infrastructure (The Registry/Provider Split)

Both Tools (`plugins/`) and Infrastructure (`plugins/core/infra/`) follow a decoupled **Hub and Spoke** pattern. We explicitly separate the orchestration hub from individual vendor integrations.

#### A. The Registry / Factory Hub (-core)

The parent directory contains a core / folder acting as a driver registry and tool factory coordinator. It exposes the Backstage extension points and compiles tools from configuration.

* **Pattern (Tools):** `@ai-crew-suite/tool-[domain]-core`
* **Pattern (Infra):** `@ai-crew-suite/infra-[domain]-core`
* *Examples:* `@ai-crew-suite/tool-vcs-core`, `@ai-crew-suite/infra-vector-core`

#### B. The Pure Driver Suppliers

Satellite folders represent the standalone vendor plugins. They handle credential resolution, instantiate concrete classes, and register themselves directly to the -core hub's extension point.

* **Pattern (Tools):** `@ai-crew-suite/tool-[domain]-[provider]`
* **Pattern (Infra):** `@ai-crew-suite/infra-[domain]-[provider]`
* *Examples:* `@ai-crew-suite/tool-vcs-github`, `@ai-crew-suite/infra-vector-pgvector`

## 🛑 Architectural Rules

1. **No Circular Dependencies:** `tools` may never depend on `agents`. `infra` may never depend on tools.
2. **Pure Providers:** Satellite driver modules (e.g., `tool-vcs-github`) should strictly register their implementation to their respective hub extension point and side-effect nothing else.
3. **No Root Clutter:** Do not flatten domain integrations into the root of `plugins/`. Keep them neatly grouped inside subdirectories (e.g., `plugins/vcs/*`).

## Fixing Build

Right now we're mixing `tsc` and `tsc -b` for build scripts across the repo. The `-b` flag duplicates work that Turbo is doing (pushing dependency rebuilds into TypeScript's graph). We should be using `backstage-cli package build`. Backstage's CLI uses Rollup.

However, it uses a global monorepo cache layer located at the root of the project in **`dist-types/`**. Because `backstage-cli package build` relies on the root `dist-types/` cache folder to generate your local type definitions, you must emit type declarations during type checking first. If you run `backstage-cli package build` on a package without running a type check across your monorepo beforehand, the build might fail, or it could bundle outdated type definitions because the global cache was not refreshed.

To ensure your types are always completely synchronized and accurate, your Turborepo task runner should always enforce type emitting *prior* to a full build execution:

1. Run **`yarn tsc`** (or your global typecheck script) at the root level. This compiles type safety across all 60+ packages and populates the root `dist-types/` directory.
2. Run your **`turbo build`** task, which triggers `backstage-cli package build` safely, pulling the fresh types directly from the cached definitions.
