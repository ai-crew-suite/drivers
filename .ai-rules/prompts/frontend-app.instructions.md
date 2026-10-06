---
name: "Frontend Plugin Guidelines"
description: "Use when editing Backstage frontend plugin code under plugins/frontend/ or the app shell in packages/app. Covers copyright headers, Backstage component conventions, MUI styling, JSDoc, and Vitest tests in sibling __tests__ directories."
applyTo:
  - "plugins/frontend/**/*.ts"
  - "plugins/frontend/**/*.tsx"
  - "packages/app/src/**/*.ts"
  - "packages/app/src/**/*.tsx"
---

# Frontend Plugin Guidelines

- This is a Backstage project. Frontend plugins live in `plugins/frontend/` and are composed into the app shell at `packages/app`.
- Every new source file must start with the Apache copyright header (`Copyright <year> Webstack Builders, Inc.`). Keep existing upstream copyright lines (e.g. Larder Software Limited) when editing forked files and add ours below. See `general-instructions.md` for the full header text.
- Add JSDoc blocks to exported functions, hooks, components, and non-trivial types per `jsdoc-guidelines.md`. For components, keep the JSDoc to a short summary and document props on the props type/interface fields; avoid `@param`/`@returns` on components.
- Build UI with Backstage's own building blocks first: `@backstage/core-components` (Page, Header, Table, InfoCard, etc.) and `@backstage/core-plugin-api` routing / `createPlugin` patterns.
- Styling uses Material-UI v4 (`@material-ui/core`, `@material-ui/icons`) with `makeStyles`/`createStyles` theming. Do not introduce Tailwind, styled-components, or other styling systems.
- Use `@material-ui/icons` for icons; do not add other icon libraries without asking.
- Prefer theme-aware MUI palette colors (`theme.palette.*`) over hard-coded hex colors so light/dark themes work.
- Access backend APIs through the plugin's typed API client (`createApiRef` + `fetchApi`/`discoveryApi`), not ad hoc `fetch` calls in components.
- Keep reusable components under the plugin's `src/components/`, one folder per component, with the folder carrying the component name.
- Keep Vitest tests in `__tests__/` folders located in the same directory as the code file being tested (e.g. `src/components/Foo/__tests__/Foo.test.tsx`, or `src/__tests__/` for files directly under `src/`). Use `*.test.tsx` for components and `*.test.ts` for hooks and plain TypeScript modules. Do not place test files directly beside the source file.
- When adding or changing a component, route, or API client, add or update coverage in the sibling `__tests__/` folder in the same change. If a file is a pure re-export or thin adapter and coverage is intentionally skipped, call that out explicitly.
- Prefer React Testing Library: render as a user would experience it, use `screen` queries and `user-event`, and assert behavior and accessible output rather than implementation details or style classes.
- Do not assert presentational style classes in tests. Class assertions are acceptable only when the class carries functional meaning (e.g. visibility toggles).
- Prefer strong explicit types over loose `Record<string, unknown>` shapes when the backend contract is known; keep shared backend-facing types in the plugin's API/types modules.
- When a frontend change depends on new backend plugin endpoints, update the typed API client and any shared `@types` in the same change.

## Validation

- `yarn test` (root Vitest) or the workspace-scoped test script.
- `yarn typecheck` / `node .yarn/sdks/typescript/bin/tsc --noEmit`.
- `yarn lint` for the affected workspace.

## Good Anchors

- `plugins/frontend/plugin-ai-crew-suite/`
- `packages/app/src/`
