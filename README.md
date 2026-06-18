# turbo

A tiny, compiler-first front-end framework. You write TSX where **the module body
*is* the component** and the **default export *is* the view** — no function wrapper.
A Vite plugin compiles the JSX into fine-grained DOM-building code wired to signals.

```tsx
import { signal } from "@turbo/reactivity";

const count = signal(0);

export default (
  <div class="counter">
    <h1>Count: {count()}</h1>
    <button onClick={() => count.set(count() + 1)}>increment</button>
  </div>
);
```

## How it works

JSX is used **as a parser, not a runtime** (the Solid / dom-expressions approach):

1. **`@turbo/compiler`** parses TSX with Babel and rewrites every top-level JSX root
   into a hoisted static-HTML `template(...)` (dynamic holes become `<!>` markers)
   plus an IIFE that clones it, walks to the markers via `nodeAt`, and wires dynamic
   parts. Every dynamic expression is wrapped in a thunk `() => expr` — **the
   compiler never decides what is reactive.**
2. **`@turbo/reactivity`** is the change-detection core: `signal` / `effect` /
   `memo` / `batch`. Reading a signal inside an effect subscribes it; writing
   re-runs subscribers. Dependencies are re-tracked each run.
3. **`@turbo/runtime`** is the DOM contract the compiler targets:
   `template`, `nodeAt`, `insert`, `setAttr`, `on`. `insert` runs a thunk inside an
   effect and swaps only that marker's nodes — fine-grained, no VDOM, no re-render.
4. **`@turbo/vite-plugin`** runs `enforce: "pre"` so JSX is compiled away before
   esbuild ever sees it.

```
.tsx ─▶ vite-plugin ─▶ compiler (Babel parse ▸ codegen) ─▶ runtime calls ─▶ DOM
                                                              ▲
                                                     reactivity (signals)
```

## Components & nesting

A `.tsx` file is a component. The compiler lifts its wrapper-free body into a
per-instance factory `(props) => Node`, so each use gets its own state:

```tsx
// Counter.tsx — reusable; each instance has its own count
import { signal } from "@turbo/reactivity";
const count = signal(0);
export default <button onClick={() => count.set(count() + 1)}>{count()}</button>;

// Header.tsx — `props` is the implicit parameter the compiler injects
export default <h1>{props.title}</h1>;

// main.tsx — the root nests other components
import Header from "./Header";
import Counter from "./Counter";
export default (
  <div class="app">
    <Header title="turbo counters" />
    <Counter />
    <Counter />  {/* independent instance */}
  </div>
);
```

Mount the root with `render(App, "#app")`. Dynamic props compile to **getters**
(`<Header n={count()}/>` → `Header({ get n() { return count(); } })`) so a child's
`props.n` stays reactive.

## Packages

| Package | Role |
| --- | --- |
| `@turbo/reactivity` | signals, effects, memo, batch (change detection) |
| `@turbo/runtime` | DOM helpers the compiler emits calls into |
| `@turbo/compiler` | TSX → fine-grained DOM-building JS |
| `@turbo/vite-plugin` | Vite integration |
| `examples/counter` | working demo app |

## Develop

```bash
pnpm install
pnpm test          # vitest unit tests (reactivity, runtime, compiler)
pnpm e2e           # Playwright browser test of the counter example
pnpm --filter counter dev
```

## v1 scope / not yet supported

- Component **children / slots** (`<Card>...</Card>` — props only for now)
- JSX **fragments** (`<>...</>`)
- JSX **nested inside `{...}` expressions** (e.g. `{cond ? <a/> : <b/>}`) — needed
  for conditionals and list rendering
- Component **children / slots** (props only for now)
- Keyed list reconciliation (`insert` currently replaces nodes wholesale)
- Sourcemap accuracy (header is prepended as a string)

These are the natural next milestones.
