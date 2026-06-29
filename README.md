# turbo

A compiler-first front-end framework. You write `.tsx` where **the module body *is*
the component** and the **default-exported JSX *is* the view** — no function wrapper,
no virtual DOM. A build step compiles the JSX into fine-grained DOM code wired to
signals, so a change updates exactly the one node it affects.

## Getting started

Requires Node 20+ and pnpm. Clone the repo, then:

```bash
pnpm install                   # install the workspace
pnpm --filter turbofocus dev   # run the demo at http://localhost:5180
```

**Turn on the language server (important).** turbo type-checks the implicit `props` at the
call site through a TypeScript plugin. Build it once (it isn't built by `pnpm install`), then
point your editor at the *workspace* TypeScript so the plugin loads:

```bash
pnpm --filter @turbo/typescript-plugin build   # required — produces dist/index.js
```

Open any `.tsx` in `examples/turbofocus`, then select the workspace TypeScript version:

- **macOS** — `⌘ ⇧ P` → *TypeScript: Select TypeScript Version* → *Use Workspace Version*
- **Windows / Linux** — `Ctrl ⇧ P` → *TypeScript: Select TypeScript Version* → *Use Workspace Version*

(If you'd already selected it, run *TypeScript: Restart TS Server* after building.)
WebStorm / IntelliJ loads it automatically from `tsconfig.json`. For CI, run
`node packages/language-tools/src/check/cli.ts <tsconfig.json>` (`turbo-check`).

Other scripts:

```bash
pnpm test                      # Vitest unit tests (all packages)
pnpm e2e                       # Playwright against examples/turbofocus
pnpm --filter turbofocus build # production build of the demo
```

## Use it in your own app

A turbo app is an ordinary Vite app: add the plugin, keep JSX as `preserve`, and register the
TypeScript plugin + JSX types.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { turbo } from "@turbo/vite-plugin";

export default defineConfig({ esbuild: { jsx: "preserve" }, plugins: [turbo()] });
```
```jsonc
// tsconfig.json
{ "compilerOptions": { "jsx": "preserve", "plugins": [{ "name": "@turbo/typescript-plugin" }] } }
```
```ts
// src/turbo-env.d.ts
/// <reference types="@turbo/language-tools/turbo.d.ts" />
```

## A component

```tsx
import { signal } from "@turbo/reactivity";

const count = signal(0); // setup — runs once per instance

export default (
  <button onClick={() => count.set(count() + 1)}>
    clicked {count()} times
  </button>
);
```

The compiler lifts this into a per-instance factory `(props) => Node`, so every
`<Counter />` gets its own `count`. `props` is injected implicitly — you never declare
it. Mount a root with `render(App, "#app")`.

Components compose, and dynamic props stay reactive (they compile to getters):

```tsx
import { input } from "@turbo/core";

const title = input("untitled"); // a signal-backed prop, named by the binding

export default <h1>{title()}</h1>; // <Header title={name()} /> keeps it live
```

## Implemented

- **Module-as-component** — no wrapper; per-instance state from top-level setup.
- **Fine-grained reactivity** — `signal`, `memo`, `effect`, `batch`, `untrack`,
  `createRoot`, and `onDestroy` for teardown. No re-render; only the bound node updates.
- **Bindings** — dynamic text/attributes, boolean attributes, and `onX` event listeners.
- **Signal props** — `input()`, `input.required()`, and `output()` for typed parent↔child wiring.
- **Conditional rendering** — `{cond() ? <A /> : <B />}` with element or component branches, nestable.
- **List rendering** — `{items().map((x) => <li>{x}</li>)}` (re-rendered wholesale, not yet keyed).
- **Components as values** — bind JSX to a variable, a `memo`, or a `signal<JSX.Element>`.
- **Native attribute names** — `class`, `for` (no `className`/`htmlFor` rewriting).
- **CSS encapsulation** — `export const config = component({ styles })` scopes a component's
  CSS (emulated, Angular/Vue-style attribute scoping); `Encapsulation.None` opts out.
- **Editor + CLI type-checking** — props are type-checked at the call site despite the
  implicit `props`, via a Volar virtual-code layer and the `turbo-check` CLI.

## Planned next

- **Keyed list rendering** — a `<For>` primitive with keyed reconciliation (today `insert`
  replaces a list's nodes wholesale, à la Solid's move to keyed diffing).
- **Component children / slots** — `<Card>…</Card>` currently drops its children.
- **JSX fragments** — `<>…</>` for component roots and branches (today they throw).
- **Parent → child-host styling** — a parent styling a child component's root element (full
  Angular emulated parity); today a component scopes only its own template.

## How it works

JSX is used **as a parser, not a runtime** (the Solid / dom-expressions lineage). Three
layers meet at a thin named contract — the compiler emits *calls* by name and wraps every
dynamic expression in a thunk; it never decides what is reactive:

```
.tsx ─▶ vite-plugin ─▶ compiler (parse ▸ scope ▸ lower ▸ factory ▸ header ▸ generate) ─▶ runtime calls ─▶ DOM
                                                                                          ▲
                                                                                  reactivity (signals)
```

| Package | Role |
| --- | --- |
| [`@turbo/reactivity`](packages/reactivity) | signals, `effect`, `memo`, `batch`, owner tree — change detection |
| [`@turbo/runtime`](packages/runtime) | the DOM contract the compiler targets (`template`, `insert`, `setAttr`, `on`, `render`) |
| [`@turbo/compiler`](packages/compiler) | TSX → fine-grained DOM-building JS (a 5-stage pipeline) |
| [`@turbo/core`](packages/core) | authoring API: `input`, `output`, `onDestroy`, `component` (CSS encapsulation) |
| [`@turbo/vite-plugin`](packages/vite-plugin) | runs the compiler as an `enforce: "pre"` Vite transform |
| [`@turbo/language-tools`](packages/language-tools) | virtual TSX for type-checking + the `turbo-check` CLI |
| [`@turbo/typescript-plugin`](packages/typescript-plugin) · [`@turbo/vscode`](packages/language-tools-vscode) | editor integration |
| [`examples/turbofocus`](examples/turbofocus) | demo app (Pomodoro timer) + Playwright e2e target |
