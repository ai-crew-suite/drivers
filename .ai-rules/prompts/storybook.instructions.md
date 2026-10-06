---
name: "Storybook Authoring"
description: "Use when creating or changing Storybook configuration, stories, decorators, or Storybook mock utilities. Covers Backstage providers, generic typed API mocks, Storybook v10 panels, interaction tests, and validation."
applyTo:
  - "packages/storybook/**"
  - "plugins/frontend/**/*.stories.ts"
  - "plugins/frontend/**/*.stories.tsx"
---

# Storybook Authoring Guidelines

## Scope and reference implementation

- Storybook is configured centrally in `packages/storybook/` and discovers frontend stories through the glob in `packages/storybook/.storybook/main.ts`.
- Treat `plugins/frontend/plugin-ai-agent-frontend-alert-ai-tuner/src/components/AlertTunerPage/AlertTunerPage.stories.tsx` as the current page-story exemplar. Read the component, its hooks, API interfaces, and this story before adding a new story.
- Add stories only for the components requested. Do not opportunistically add stories across other plugins.
- Keep `packages/storybook/` independent of individual frontend plugins. It may provide generic decorators, providers, and mock helpers, but must never import, name, register, or special-case a specific plugin or its API reference.
- Keep plugin-specific API references, fixtures, stream events, and mock behavior next to that plugin's stories.

## Story structure

- Write Component Story Format (CSF) stories in `*.stories.tsx` beside the component they document.
- Use `Meta` and `StoryObj` from `@storybook/react-vite`; title stories consistently under the plugin/component hierarchy.
- Give each stateful story a concise JSDoc description explaining the user-visible state it demonstrates.
- For page components, set `layout: 'fullscreen'` when the page requires the complete viewport.
- Include `tags: ['autodocs']` for documented exemplar stories. The shared preview config provides dynamic source code for Storybook's Code/Docs experience.
- Create useful, deterministic states from the component's actual contract: for example idle, in-progress, completed/reviewable result, approval-required, and error states when those states exist. Do not invent UI props or production behavior only to make a story look fuller.

## Backstage context and routes

- The shared preview decorator already supplies Backstage test app context, theme, baseline APIs, and story loader API pairs. Provide additional plugin APIs through a story loader returning:

  ```tsx
  { mockApis: [[pluginApiRef, apiImplementation]] }
  ```

- Do not add a local `TestApiProvider` or duplicate the global decorator in every story.
- For a page whose state is loaded from a query parameter or route, set route entries through `parameters.backstage`, for example:

  ```tsx
  parameters: { backstage: { routeEntries: ['/?run=run-123'] } }
  ```

- Verify the component's actual hook/API methods before mocking. A mock with obsolete method names can compile yet leave the story stuck in a loading/idle state.

## Generic, typed API mocks

- Reuse `createMockApi` and `createMockFn` from `@ai-crew-suite/cli/storybook/mocks`.
- Type each story API against the plugin's exported API interface. Supply all methods the rendered component can call:

  ```tsx
  const api = createMockApi<MyPluginApi>({
    loadThing: createMockFn(async () => fixture),
    submitThing: createMockFn(async () => undefined),
  });
  ```

- For APIs returning `AsyncGenerator` values, create deterministic local async-generator helpers and yield real event shapes from the plugin's types. Use the same events that the production hook reduces; do not mock the hook itself unless the component architecture makes that the established pattern.
- Use `createMockFn` for functions whose calls should be visible in Storybook's Actions tooling. Keep fixtures and API-specific helper builders in the story file (or a plugin-local story helper if multiple stories genuinely share them).
- Never add `Mock<SpecificPlugin>Api`, singleton plugin mocks, plugin imports, or plugin API references under `packages/storybook/`. The shared package must remain reusable as frontend plugins gain stories.
- Prefer explicit, typed objects over `any`, `Record<string, unknown>`, or string arrays of method names.

## Storybook v10 panels

### Controls

- Controls are appropriate for genuine public component props that make meaningful visual or behavioral variations. Define typed `args` and `argTypes` only for those real props.
- A page/container component with no props should have an empty Controls panel. Do **not** add artificial props or wrapper-only controls just to populate it.

### Actions

- Actions are appropriate for real callback props (normally `onX`) and for calls recorded by `createMockFn` where the story intentionally exposes an API interaction.
- A component with no callback props can legitimately have an empty Actions panel. Do **not** redesign a component or add fake callbacks merely to populate Actions.

### Interactions

- Add a `play` function when a user interaction has meaningful behavior to demonstrate or protect. Use `userEvent` and accessible queries from `storybook/test`.
- Scope queries for elements rendered in the story to `within(canvasElement)`.
- Material-UI dialogs, menus, popovers, and other portals render outside `#storybook-root`. Query those from document-level `screen`, not the canvas.
- Material-UI transition elements can be present before they are visible. For portal dialogs, wait for visibility after locating the role:

  ```tsx
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(dialog).toBeVisible());
  ```

- Assert accessible, user-observable outcomes. Avoid assertions on generated MUI class names or implementation details.

### Code and Docs

- The shared preview config enables dynamic source display. Keep stories in standard CSF and avoid custom render indirection unless it materially improves the story; this keeps Storybook's Code tab useful.
- Add component/story descriptions where they clarify an important state, API contract, or workflow. Do not add redundant prose for self-evident props.

## Shared configuration safety

- Preserve the shared `UnifiedThemeProvider` in the preview decorator. Backstage themes are unified themes; passing them directly to Material-UI v4 `ThemeProvider` breaks v4 components because typography and other v4 fields are absent.
- Preserve the existing shared `TestApiProvider` and `wrapInTestApp` setup. Extend it generically only when multiple stories need a framework-level capability.
- Do not add dependencies or addons unless the existing Storybook v10 installation cannot provide the required capability.

## Validation

- Run the narrowest relevant checks after story/config changes. Activate Node through nvm first, as required by `.clinerules`.
- At minimum for a frontend plugin story, run:

  ```sh
  node .yarn/sdks/typescript/bin/tsc --noEmit -p plugins/frontend/<plugin>/tsconfig.json
  ```

- For shared Storybook changes, also run:

  ```sh
  yarn workspace @ai-crew-suite/storybook-workspace-infra typecheck
  yarn workspace @ai-crew-suite/storybook-workspace-infra lint
  yarn storybook:build --force
  ```

- Remove generated `packages/storybook/storybook-static/` output after local build validation if it is untracked, and finish with `git --no-pager diff --check`.