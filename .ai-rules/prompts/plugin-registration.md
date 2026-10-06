# Plugin Registration (Monorepo)

When you create or scaffold a new plugin (frontend or backend, including
`*-module` siblings), you MUST register it in the shared monorepo configs so
that `typecheck` and `lint` cover it with the correct ruleset. Forgetting this
leaves the new package silently typechecked/linted with the wrong (base) config —
the same class of coverage gap we have hit before.

## 1) Add a TypeScript project reference

In the root `tsconfig.json`, add a `{ "path": "./<plugin-dir>" }` entry to the
`references` array, placed in the matching logical group. Every package under
`packages/*` and `plugins/**/*`, plus `./test`, must be listed.

## 2) Add an ESLint role override

In the root `.eslintrc.cjs`, add a `scopedOverrides` entry for the new package:

```js
...scopedOverrides(
  '<plugin-dir>',
  createConfigForRole(__dirname, '<role>'),
),
```

`<role>` must match the package's `backstage.role` field (for example
`backend-plugin-module`, `backend-plugin`, `frontend-plugin`, or
`node-library`). Without this, `backstage-cli package lint` applies the base
config instead of the role-specific config — for example, backend modules then
lose `no-console: off` and the `__non_webpack_require__` global.

## 3) Verify

Run `yarn typecheck --force` and `yarn lint --force` and confirm the new
package is picked up and passes. `--force` is required because turbo caches
per-package inputs that do not include the root `tsconfig.json` /
`.eslintrc.cjs`, so edits to those root configs do not invalidate the cache on
their own.
