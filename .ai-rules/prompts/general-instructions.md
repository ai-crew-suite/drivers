# AI Crew Suite Project Instructions

You are working in AI Crew Suite, a Backstage monorepo (Yarn Berry PnP + turbo) providing agentic AI plugins. Backend plugins and modules live in `plugins/backend/`, frontend plugins in `plugins/frontend/`, and the Backstage app/backend wrappers in `packages/app` and `packages/backend`.

## Repository Shape

- Backend plugins and backend plugin modules live in `plugins/backend/` (including `*-module` siblings).
- Frontend plugins live in `plugins/frontend/`.
- `packages/app` is the Backstage frontend app shell; `packages/backend` is the Backstage backend that wires plugins in.
- Shared tests and test config live in `test/` (Vitest, `test/vitest.config.ts`).
- Docs live in `docs/`.

## Copyright Header

- Every new TypeScript/JavaScript source file (`*.ts`, `*.tsx`, `*.js`) must start with the Apache license header, before any imports:

```ts
/*
 * Copyright 2026 The AI Crew Suite Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
```

- When a file was originally forked from another project (e.g. files carrying Larder Software Limited headers), keep the original copyright lines intact and add the Webstack Builders line below them. Do not remove or rewrite existing upstream copyright attributions.
- Use the current year for newly authored files.

## Documentation Standards

- Add JSDoc blocks to all exported functions, classes, interfaces, and type declarations. Follow the rules in `jsdoc-guidelines.md`:
  - Do not repeat TypeScript types in JSDoc (`@param {string}` etc.) — the signature already carries them.
  - Use `@param` / `@returns` only when they add meaning (constraints, formats, edge cases).
  - Use `@example`, `@deprecated`, `@see`, `@throws` where they materially help.
- For React components and providers, keep the component JSDoc to a short summary paragraph and document props on the props type/interface fields. Avoid `@param`/`@returns` on components.
- Do not add noisy boilerplate to trivial one-line helpers.

## Working Norms

- Prefer the smallest correct slice of work. Not every request requires changes across backend and frontend plugins.
- Packages are published under the `@ai-crew-suite` scope.
- Preserve existing naming and API shapes; Backstage packages follow the `backstage.role` field (`backend-plugin`, `backend-plugin-module`, `frontend-plugin`) and its conventions.
- Backend modules rely on `no-console: off` and the `__non_webpack_require__` global from the ESLint role overrides — do not remove those overrides.
- When scaffolding a new plugin, follow `plugin-registration.md` to register it in root `tsconfig.json` and `.eslintrc.cjs`.

## Testing And Validation

- Tests use Vitest (root config at `test/vitest.config.ts`); place `*.test.ts` / `*.test.tsx` files in a `__tests__/` directory in the same directory as the code file being tested (never directly beside the source file).
- Common commands (activate nvm first — see `.clinerules` for the snippet):
  - `yarn test` / `yarn test:watch`
  - `yarn typecheck` (add `--force` after editing root configs)
  - `yarn lint` (add `--force` after editing root configs)
  - TypeScript directly: `node .yarn/sdks/typescript/bin/tsc --noEmit`
- Prefer focused validation (single workspace) over full-suite runs when the change is localized.

## Tooling Notes

- Node.js is managed via nvm (`nvm use 22.21.1`); there is no `node_modules/.bin` (Yarn PnP). Use `yarn <script>` after nvm activation.
- Do not run interactive/paged commands; see `.clinerules` for the full terminal rules.
