---
name: 'Bug Report'
about: 'Report a glitch in an AI tool, RAG engine, or forked plugin'
labels: ['kind/bug', 'triage']
---

## Description

<!-- Provide a clear and concise summary of what the bug is. -->

## Affected Workspaces

<!-- Put an [x] next to all layers impacted by this glitch -->

- [ ] **AI Tools / Crew Layouts** (e.g., `packages/tool-crew-*`)
- [ ] **Forked RAG AI Plugins** (e.g., `packages/plugin-ai-*`)
- [ ] **Core Application Platform** (`packages/app` or `packages/backend`)
- [ ] **Developer Infrastructure** (Turbo, Yarn, Husky, Playwright)

## Expected Behavior

<!-- Tell us what should happen under normal operating parameters -->

## Current Behavior

<!-- Tell us what happens instead. Include specific details about stream failures, token cuts, or UI lockups if applicable -->

## Steps to Reproduce

1. Go to Backstage Component view / UI panel: `____`
2. Trigger the following prompt or action: `____`
3. Observe the breakdown or stack trace.

## Technical Context & Telemetry

<!-- Providing specific logs or environmental telemetry dramatically cuts down triage time -->

### 🪵 Stream or Router Logs (Backstage Contextual Logger)

```text
// Paste relevant log snippets from yarn start / yarn start-backend here
```

### 🧠 Model & Vector Infrastructure Context

- **LLM Engine / Provider**: (e.g., OpenAI gpt-4o, Anthropic Claude 3.5, Local Ollama)
- **Vector Store / Source**: (e.g., Pinecone, PGVector, Local Embedded)
- **Stream Delivery**: [ ] Asynchronous SSE Stream (`eventsource-parser`) | [ ] Blocking JSON Rest Payload

## System Environment

- **Node.js Version** (`node -v`):
- **Yarn Version** (`yarn -v`):
- **Operating System / Workstation Platform**: (e.g., Ubuntu Linux, macOS, WSL2)
