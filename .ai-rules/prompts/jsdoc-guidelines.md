# JSDoc Guidelines (TypeScript)

When adding or modifying code, include JSDoc blocks that explain intent, behavior, constraints, and usage expectations.

## 1) Omit structural types

Avoid redundant type annotations in JSDoc when TypeScript already defines them.

- Do not add `@type` tags for symbols already typed in code.
- Do not use `{Type}` in `@param` or `@returns` when the function signature already provides the type.

Reason: duplicate type declarations create dual-maintenance overhead and drift risk.

## 2) Use `@param` / `@returns` only when they add meaning

Add `@param` and `@returns` only if you need to clarify behavior, constraints, units, accepted formats, or edge cases.

If names and signatures are already self-explanatory, prefer a short prose summary and omit those tags.

## 3) Use high-value IDE tags when relevant

Use rich tags to improve hover/autocomplete ergonomics in VS Code:

- `@example` for concrete usage snippets.
- `@deprecated` when APIs should no longer be used.
- `@see` for related APIs or references.
- `@throws` when callers should handle runtime errors.

Use these tags only where they materially improve discoverability.

## 4) Document architecture types too

Document shared `interface` and `type` declarations, not just functions/classes.

Focus on purpose and semantics so developers understand how to compose objects correctly during implementation and dependency wiring.
