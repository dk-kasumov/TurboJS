---
name: unit-testing
description: Conventions for writing and maintaining tests in the turbo monorepo (Vitest + happy-dom unit tests, Playwright e2e). Use when adding/refactoring tests, when adding a framework feature that needs coverage, or when deciding what to test at which layer.
---

# turbo — unit testing conventions

## Toolchain
- **Unit**: Vitest + `happy-dom` (configured globally in `vitest.config.ts`, `globals: true`).
- **E2E**: Playwright driving `examples/counter` (`playwright.config.ts`).
- Commands: `pnpm test` (run once), `pnpm test:watch`, `pnpm e2e`.
- Tests are **co-located**: `packages/<pkg>/src/index.test.ts`.

## What to test at each layer (test at the lowest layer that can prove it)
- **`@turbo/reactivity`** — pure behavior, no DOM. Assert *fine-grained* semantics with
  `vi.fn()` spies: N writes ⇒ exactly N effect runs, no-op writes (`Object.is`) ⇒ 0 runs,
  dynamic dependency tracking, `batch` coalescing, `onCleanup` on re-run + dispose, dispose stops the effect.
- **`@turbo/runtime`** — DOM behavior in happy-dom. `template`/`nodeAt`/`insert` (static + reactive
  thunk + element swap), `setAttr` boolean/null, `on`, `render` mounting and **instance independence**.
- **`@turbo/compiler`** — assert on `compile()` output. Two rules:
  1. Always re-`parse()` the output to prove it is valid JS with no leftover JSX (`compileOk` helper).
  2. Match structure with **whitespace-normalized** substrings (`norm = s => s.replace(/\s+/g, " ")`),
     because Babel re-prints (strips redundant parens, spaces arrays as `[0, 1]`). Never assert exact formatting.
- **E2E** — real browser only for user-facing behavior. Target by `data-testid`, use `.nth(i)` for
  multiple instances, assert reactive updates AND that unrelated instances are unaffected.

## Conventions
- One behavior per test; descriptive names ("does not re-run when value is unchanged").
- Arrange/Act/Assert; prefer spies that count runs over snapshotting internals.
- When a runtime test needs a "component", hand-write a factory shaped exactly like compiler output
  (a function returning a Node) rather than importing the compiler.
- **Every new feature** gets unit tests at its lowest layer; add one e2e only if it changes what the user sees.
- Keep the whole suite green before moving on; a refactor is "done" when `pnpm test` and `pnpm e2e` both pass with unchanged behavior.
