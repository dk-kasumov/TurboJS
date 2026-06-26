# CLAUDE.md

Guidance for working in the **turbo** repository. Read this before editing — turbo's
core mechanic (the module *is* the component) is non-obvious and easy to break.

## What turbo is

A compiler-first front-end framework. You author `.tsx` files where **the module body
is the component** and the **default-exported JSX is the view** — there is no function
wrapper. A build step compiles the JSX away into fine-grained DOM-building code wired to
signals. No virtual DOM, no re-render: a change updates exactly the one DOM node it
affects.

```tsx
import { signal } from "@turbo/reactivity";

const count = signal(0);                       // component setup (per instance)

export default (                               // the view
  <button onClick={() => count.set(count() + 1)}>{count()}</button>
);
```

The compiler lifts that into `export default function (props) { const count = signal(0); return <dom>; }`,
so every `<Counter />` use gets its own `count`. `props` is an **implicit parameter the
compiler injects** — it is never declared in source.

## The three-layer invariant (do not violate)

```
compiler (parse + codegen)  ──emits──▶  runtime (DOM)
                                          ▲
                                   reactivity (signals)
```

- **`@turbo/compiler`** never imports `runtime` or `reactivity`. It emits *named calls*
  (`_$insert`, `_$setAttr`, …) and thunks `() => expr`. **The compiler never decides what
  is reactive** — it wraps every dynamic expression in a thunk and hands it to the runtime.
- **`@turbo/runtime`** owns the DOM and decides reactivity by running thunks inside effects.
- **`@turbo/reactivity`** knows nothing about DOM or JSX.

If a change makes the compiler aware of DOM internals, or the runtime aware of JSX, it is
in the wrong layer. See `.claude/skills/solid-gof`.

## Monorepo layout

| Path | Role |
| --- | --- |
| `packages/reactivity` | signals, `effect`, `memo`, `batch`, `untrack`, `onCleanup`, `createRoot` — change detection |
| `packages/runtime` | DOM contract: `template`, `nodeAt`, `insert`, `setAttr`, `on`, `createComponent`, `render` |
| `packages/compiler` | TSX → fine-grained DOM JS (5-stage pipeline under `src/stages`: parse → lower → factory → header → generate) |
| `packages/core` | authoring API: `input`, `output`, `onDestroy` (compiler rewrites these to `_$input`/`_$output`) |
| `packages/vite-plugin` | `enforce: "pre"` Vite transform that runs the compiler |
| `packages/language-tools` | Volar virtual code + `turbo-check` CLI + `turbo.d.ts` JSX types |
| `packages/typescript-plugin` | wraps language-tools as a TS Server plugin (editor) |
| `packages/language-tools-vscode` | thin VS Code extension that registers the plugin |
| `examples/turbofocus` | working demo (Pomodoro timer), also the Playwright e2e target |

## Commands

```bash
pnpm install
pnpm test          # Vitest unit tests (all packages) — run after every change
pnpm test:watch
pnpm e2e           # Playwright against examples/turbofocus
pnpm --filter turbofocus dev
pnpm --filter turbofocus build
node packages/language-tools/src/check/cli.ts <tsconfig.json>   # turbo-check type checker
```

Packages ship **raw `.ts`** (`main` / `exports` point at `src/*.ts`); there is no library
build step. Transpilation is the consumer bundler's job (Vite for the app, Vitest for
tests). Only `typescript-plugin` and `language-tools-vscode` have an esbuild build (→ CJS).

## Conventions

- **No code comments.** Write self-documenting code — clear names over explanation.
  (Markdown docs like this file are fine.)
- **Co-located tests**: `packages/<pkg>/src/*.test.ts`. Test at the lowest layer that can
  prove the behavior. See `.claude/skills/unit-testing` for what to assert where.
- **Compiler tests** must re-`parse()` the output (prove no leftover JSX) and match
  structure with whitespace-normalized substrings — never assert Babel's exact formatting.
- TS with `moduleResolution: "Bundler"` and `allowImportingTsExtensions` — imports use
  explicit `.ts` extensions (`import { lower } from "./stages/02-lower/lower.ts"`).
- One small step at a time; keep `pnpm test` green between steps.

## The two transforms that must stay in sync

The "module → `(props) => view`" wrap exists **twice**:

1. `packages/compiler/src/stages/03-factory/factory.ts` (`factory`) — produces the *runtime*
   factory that actually executes.
2. `packages/language-tools/src/core/transform.ts` (`transform`) — produces a *type-checkable*
   virtual TSX (`const __turbo_default = (props: Props): JSX.Element => {...}`) with source
   mappings so errors land on the authored code.

Both share helpers from `packages/compiler/src/module-shape.ts` (`findDefaultExport`,
`isFactoryDeclaration`, `partitionModuleBody`, `collectIO`). **If you change the component
model, change both** or the editor will type-check a program that differs from what runs. The
props type is found by convention: a top-level `interface Props` / `type Props`, else a type
derived from `input()`/`output()` bindings, else `TurboProps` (= `Record<string, any>`,
unchecked).

## Gotchas / current limitations

- **Conditionals and lists work** — lowering recurses into expressions, so
  `{cond() ? <a/> : <b/>}` and `{items().map(x => <li/>)}` compile. But **lists are not
  keyed** — `insert` replaces a list's nodes wholesale on any change.
- **No fragment support** — root `<>...</>` throws; nested fragments throw.
- **Components ignore children** — only attributes are mapped; `<Card>x</Card>` drops `x`. No slots.
- **No `ref`** — `ref={el}` is treated as an ordinary attribute (`setAttr("ref", …)`).
- **Reactivity scheduler** is synchronous but **not fully glitch-free** (a sink reading both a
  source and a memo of that source can run twice) and has **no cycle detection**. `render`
  returns a **disposer**, not a `Node`.
- **`setAttr` always uses `setAttribute`** — DOM *properties* like an input's live `value`
  or `checked` are not set; controlled inputs won't fully work.
- **`getLanguageId` treats every `.tsx` as a turbo module** (falls back to identity if there
  is no default export or it is already a function).

Each package has a `README.md` with its design and data flow; the compiler's stages are
documented per-folder under `packages/compiler/src/stages`.
