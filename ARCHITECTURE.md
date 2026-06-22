# turbo — Architecture

turbo is a **compiler-first** front-end framework. JSX is used as a *parser, not a runtime*
(the Solid / dom-expressions lineage). At build time, JSX collapses into static HTML
templates plus a handful of imperative DOM calls wired to signals. At run time there is no
virtual DOM and no component re-render — a signal write updates exactly the DOM node bound
to it.

This document explains how the pieces fit. For day-to-day rules see [CLAUDE.md](CLAUDE.md);
for design-principle guidance see `.claude/skills/solid-gof`.

---

## 1. The big picture

```
 author .tsx                                                       browser DOM
     │                                                                  ▲
     ▼                                                                  │
 vite-plugin (enforce: "pre")                                  runtime calls
     │  intercepts *.tsx before esbuild                                 │
     ▼                                                                  │
 @turbo/compiler ──── Babel parse ▸ lower to IR ▸ codegen ────▶ JS that:
     │                                              • clones a hoisted template()
     │                                              • walks to markers via nodeAt()
     │                                              • insert()/setAttr()/on() the holes
     │                                                                  │
     └─ never imports ↓                                                 │
                @turbo/reactivity (signals) ◀── runtime runs thunks in effects
```

Three packages form the core, joined only by a thin **named contract** (the runtime helper
names + the thunk convention). Each can be reasoned about and swapped independently — e.g. a
string/SSR renderer could replace `@turbo/runtime` without touching the compiler.

---

## 2. Authoring model: the module *is* the component

A `.tsx` file is a component. Its top-level statements are the component **setup**; its
**default-exported JSX expression** is the **view**. There is no `function Component()` and
no explicitly declared `props`.

```tsx
import { signal } from "@turbo/reactivity";   // stays at module scope (shared)
const count = signal(0);                       // setup — re-runs per instance
export default <button onClick={() => count.set(count() + 1)}>{count()}</button>;
```

The compiler rewrites this into a per-instance factory:

```js
import { signal } from "@turbo/reactivity";    // kept at module scope
export default function (props) {              // props injected implicitly
  const count = signal(0);                      // moved inside → own state per instance
  return (/* compiled DOM-building IIFE */);
}
```

**Partitioning rule** (`packages/compiler/src/module-shape.ts`):

- *Keep at module scope* (`isKeepStatement`): imports, named/`*` re-exports, `type`/`interface`.
- *Move into the factory body* (setup): everything else, in original order.
- If the default export is **already a function/class** (`isFactoryDeclaration`), the file is
  left alone — you can opt out of the magic by writing `export default (props) => <…>`.

`props` resolves as a free variable that the injected `(props)` parameter binds. Children
read parent-passed props through it (`props.title`).

---

## 3. `@turbo/compiler` — TSX → DOM-building JS

Pipeline orchestrated by `Compiler.compile()` (`src/compiler.ts`):

```
parse ──▶ traverse roots ──▶ lower(JSXElement) ──▶ Template(html, parts)
                                                       │
                                          emit(template) ──▶ IIFE expression
                                                       │
              replace root JSX with the IIFE; factory-wrap the module;
              prepend `_tmpl$N = template(html)` decls + runtime import
```

### 3.1 Parser (`src/parser.ts`)
Thin wrapper over `@babel/parser` / `traverse` / `generator` (with the
`.default` interop dance for ESM). Parses with `jsx` + `typescript` plugins; generates with
source maps. Isolated so the rest of the compiler never touches Babel I/O directly.

### 3.2 Root selection (`src/compiler.ts`)
`traverse` visits `JSXElement`s; only **roots** (no JSX ancestor) are lowered. The root is
`replaceWith(iife)` then `path.skip()` so its children aren't visited independently. A module
can have several sibling roots (e.g. three exported JSX expressions) → several templates.
A root `JSXFragment` throws ("not supported yet"). If a module has zero roots, the AST is
regenerated untouched (no runtime import added).

### 3.3 Lowering (`src/lowering.ts`) → IR (`src/ir.ts`)
`TemplateLowerer.lower` walks one root element and produces a `Template { html, parts[] }`:

- **Static** structure (tags, static string attributes, static text) is concatenated into an
  **HTML string** (escaped; `className`→`class`, `htmlFor`→`for`; void elements self-close).
- **Dynamic** pieces become `Part`s carrying a **numeric child-index `path`** from the root:
  - `InsertPart` — a `{expr}` child (dynamic, thunked) or a child **component call**
    (static insert). Emits `<!>` comment marker into the HTML.
  - `AttributePart` — a `name={expr}` attribute. Reactive (emitted inside an effect).
  - `EventPart` — an `onX={handler}` attribute → `on(el, "x", handler)`.
- Child components (`<Foo … />`) lower to `Foo({ "p": v })`: static attrs → object
  properties, **dynamic attrs → getters** (`get "n"() { return v(); }`) so the child's
  `props.n` re-reads reactively, bare attrs → `true`. **Children are not collected** (no slots).

The `Part` classes are a **Strategy/Interpreter**: each knows how to `emit(ctx)` itself, so
adding a binding kind extends rather than edits the walker.

### 3.4 Codegen (`src/codegen.ts`)
- `RuntimeRegistry` tracks which helpers are used and emits aliased imports
  (`import { insert as _$insert } from "@turbo/runtime"`) — only what's needed.
- `TemplateEmitter.emit` builds the per-template IIFE:
  ```js
  (() => {
    const _el$ = _tmpl$0();                 // clone the hoisted template
    const _n$0 = _$nodeAt(_el$, [0, 1]);    // walk to each marker by index path
    _$insert(_n$0, () => count());          // wire the holes
    return _el$;
  })()
  ```
  Markers are de-duplicated by path (`refs` map); the root reuses `_el$`.
- `ModuleEmitter.headerStatements` prepends the hoisted `const _tmpl$N = _$template("…")`
  declarations and the runtime import.

### 3.5 Factory wrap (`src/transforms.ts`)
`FactoryTransform.apply` performs the module→factory rewrite described in §2, using the
`module-shape` helpers. Runs after lowering so the wrapped `return` is the compiled IIFE.

---

## 4. `@turbo/reactivity` — change detection

A small push-based signal system with an **owner tree** and a **synchronous scheduler**
(`src/index.ts`, types in `src/types.ts`). Two ambient pointers drive it: `activeReaction`
(who is currently *tracking* dependencies) and `activeOwner` (who currently *owns* newly
created reactions + cleanups). `untrack` clears only the former; ownership is unaffected.

- **`signal(initial)`** → a callable getter with a `.set`. Reading inside an active reaction
  subscribes (bidirectional: a source's `observers` ⇄ the reaction's `deps`). `.set` skips on
  `Object.is`, else **enqueues all observers and flushes once** (see scheduler).
- **`effect(fn)`** → runs `fn` immediately; before each run it `dispose`s itself (disposes
  owned children, unsubscribes deps, fires cleanups) then re-tracks, so **dependencies are
  dynamic**. Returns a disposer.
- **`memo(fn)`** → **lazy**: it does not compute until first read. A dependency change marks it
  stale and propagates to *its* observers; the value is recomputed on the next read and cached.
- **`createRoot(fn)`** → opens a top-level owner scope; `fn` receives a `dispose` that tears
  down everything created within. `render` uses this so a whole component tree can be unmounted.
- **`batch(fn)`** → defers the flush until the outermost batch closes, so N writes coalesce
  into one downstream run.
- **`untrack(fn)`** → runs with no active reaction (reads don't subscribe).
- **`onCleanup(fn)`** → registers a cleanup on the **active owner**, fired when that owner
  re-runs or is disposed. This is the component "destroy" hook: when reactive content is
  swapped out (or a root is unmounted), the owning scope disposes and these run.

### 4.1 The owner tree (disposal)
Every `effect`/`memo`/`createRoot` `adopt`s the current `activeOwner` as parent and is pushed
onto that owner's `owned[]`. `dispose(reaction)` recurses **children-first**, then unsubscribes
deps, then runs cleanups. Because an effect re-run begins with `dispose(self)`, **any
effect/memo created during the previous run is torn down before the next** — this is what stops
the classic "effects created inside effects leak" problem, and it flows straight through the
runtime: `insert`'s reactive effect owns whatever nested bindings the swapped-in content
created, so swapping it out disposes them.

### 4.2 The scheduler (batching, glitch behavior)
A single global `queue: Set<Reaction>` plus a `flush()` that drains it to a fixpoint. A signal
write `notify`s — enqueues *all* its observers, then flushes once (unless inside a `batch`, or
already flushing, guarded by a `flushing` flag). Memos enqueue their observers when they go
stale. Deduping in the `Set` makes the **canonical diamond** (`a → b,c → sink`) run the sink
**once**. Remaining sharp edges: a sink that reads *both* a source and a memo derived from that
same source can still run twice; there is no cycle detection (an effect that writes a signal it
reads loops). Both are documented trade-offs, not solved by this scheduler.

---

## 5. `@turbo/runtime` — the DOM contract

The set of helpers the compiler targets (`src/index.ts`):

- **`template(html)`** — lazily parses `html` once into a `<template>` and returns a
  function that **clones** it per call (Flyweight). Single-root only (`content.firstChild`).
- **`nodeAt(root, path)`** — walks `childNodes` by the compiler's index path. Works because
  the compiler builds the HTML string itself, so DOM child order matches the path indices.
- **`insert(marker, value)`** — the reconciler. If `value` is a function, runs it in an
  `effect` and swaps the marker's nodes on change (fast path: in-place `Text.data` update
  when both old and new are a single text node; otherwise remove-all + insert-all — **no
  keyed diffing**). Non-function values insert once. `toNodes` flattens arrays, drops
  `null`/booleans, wraps primitives in text nodes.
- **`setAttr(el, name, value)`** — `null`/`false` removes, `true` sets `""`, else
  `String(value)`. Always an *attribute* (not a property — see limits in CLAUDE.md).
- **`on(el, type, handler)`** — `addEventListener`, with the handler wrapped in `batch` so
  multiple signal writes inside one event coalesce into a single flush (no delegation, no removal).
- **`render(component, container)`** — composition root: opens a `createRoot`, calls
  `component({})`, appends the node, and **returns a disposer** that unmounts the node and tears
  down the scope (runs every `onCleanup`). No hydration.

---

## 6. Language tooling — type-checking the magic

The hard problem: `props` is never declared, and `<Header title="x" />` must type-check
against `Header`'s `Props` even though `Header.tsx` has no function signature. Solved with a
**Volar virtual code** layer (`packages/language-tools`).

```
authored .tsx ──transform()──▶ virtual .tsx (typed)            same plugin used by:
  interface Props {…}            const __turbo_default =          • turbo-check CLI (proxyCreateProgram)
  export default                   (props: Props): JSX.Element    • TS Server plugin (editor)
    <h1>{props.title}</h1>          => { return (<h1>…</h1>); };
                                   export default __turbo_default;
       └── CodeMappings map every authored range 1:1 into the virtual file,
           so diagnostics land on the authored token (e.g. `titel`, `bogus`).
```

- `src/core/transform.ts` — mirrors `FactoryTransform` but emits a *typed* arrow with a
  `: JSX.Element` return annotation (only for JSX defaults) and precise source mappings via
  `VirtualBuilder.copy`. Props type = a declared `Props`, else `TurboProps`. Syntax errors
  and non-magic modules fall back to identity (the file is passed through unchanged).
- `src/core/virtual-code.ts` / `language-plugin.ts` — wires the transform into Volar as a
  `LanguagePlugin`; any `.tsx` is given language id `turbo` and served as `.tsx`/TSX.
- `src/check/` — `check(tsconfig)` runs a real `ts.Program` through `proxyCreateProgram` and
  aggregates config/syntactic/global/semantic diagnostics; `cli.ts` is the `turbo-check` bin.
- `lib/turbo.d.ts` — the global `JSX` namespace (`Element = Node`, intrinsic element attribute
  interfaces, event handler types, `data-`/`aria-` index signatures) and `TurboProps`.
- `packages/typescript-plugin` wraps the same plugin as a TS Server plugin; the VS Code
  extension just activates the built-in TS extension so the plugin loads.

**Tested both ways**: `check/index.test.ts` (program path) and `check/language-service.test.ts`
(editor path) both assert that good components pass and that missing/wrong-type/unknown props
are flagged **at the authored call site**.

---

## 7. Design patterns in play

| Pattern | Where |
| --- | --- |
| **Observer** | reactivity core (signals ↔ reactions) |
| **Visitor** | Babel `traverse` over the AST |
| **Composite / Interpreter** | the JSX tree + `Part` IR with `emit()` |
| **Strategy** | `Part` subclasses (insert / attr / event emitters) |
| **Factory** | components are `(props) => Node`; `render` is the composition root |
| **Flyweight** | `template()` parses once, clones per instance |
| **Registry** | `RuntimeRegistry` collects + aliases used helpers |
| **Adapter / Proxy** | Volar virtual code adapting `.tsx` → typed virtual TSX |

---

## 8. Build, test, and packaging

- **Workspace**: pnpm, `packages/*` + `examples/*`. Core libs publish **raw `.ts`**
  (`main`/`exports` → `src/*.ts`); transpilation is delegated to the consumer bundler. Only
  `typescript-plugin` and `language-tools-vscode` have an esbuild → CJS build.
- **Unit**: Vitest + happy-dom, co-located `*.test.ts` (41 tests, all green).
- **E2E**: Playwright drives `examples/counter` on port 5180.
- **Type-check the framework's own contract**: `turbo-check` over the example/fixtures.

---

## 9. Known limitations & natural next milestones

1. **Control flow** — JSX inside `{…}` is not lowered, so `{cond ? <a/> : <b/>}` and
   `{items.map(…)}` don't work. Unblocks conditionals/lists. The IR's Strategy shape is the
   right seam to add `insert` reconcilers (text / list / branch).
2. **Fragments** — root and nested `<>…</>` throw.
3. **Component children / slots** — `componentCall` drops children.
4. **Keyed list reconciliation** — `insert` replaces nodes wholesale.
5. **`ref`, property-vs-attribute, `style`/`class` objects** — not handled.
6. **Reactivity depth** — `batch`, lazy `memo`, and an owner/scope disposal tree now exist
   (§4). Still missing: full glitch-freedom (topological scheduling), cycle detection, async
   transitions, and stores (nested/fine-grained object reactivity).
7. **Packaging** — no `.d.ts` emit / dist for the core libs (fine in-repo, not yet npm-ready).
8. **Doc/test drift** — the e2e references a `double` memo the example lacks (stale test).
