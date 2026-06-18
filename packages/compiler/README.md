# @turbo/compiler

Turns a `.tsx` module into plain DOM-building JavaScript wired to signals. It is the
front end of turbo: a Babel-based transform that reads JSX **as a parser, not as a
runtime** (the Solid / dom-expressions approach) and emits fine-grained code that builds
real DOM nodes and binds the dynamic bits to the reactivity system.

```ts
import { compile } from "@turbo/compiler";

const { code, map } = compile(sourceText, "Button.tsx");
```

---

## The one idea everything is built on

Every JSX root splits into two things:

1. **One static HTML string** — the markup that never changes, with a `<!>` comment
   marker punched out at every dynamic hole.
2. **A list of dynamic "parts"** — the holes, each one located by a **child-index path**
   from the root and carrying the expression that fills it.

At runtime the HTML string is parsed **once** into a `<template>` and **cloned** per
instance (cheap); the markers are then walked to by index and filled in. The compiler
never decides what is reactive — it just wraps every dynamic expression in a thunk
`() => expr` and hands it to the runtime, which subscribes it.

### Worked example

Input:

```tsx
import { signal } from "@turbo/reactivity";
const count = signal(0);
export default <button class="btn" onClick={() => count.set(count() + 1)}>Count: {count()}</button>;
```

Output:

```js
import { template as _$template, insert as _$insert, on as _$on, nodeAt as _$nodeAt } from "@turbo/runtime";
const _tmpl$0 = _$template("<button class=\"btn\">Count: <!></button>");
import { signal } from "@turbo/reactivity";
export default function (props) {
  const count = signal(0);
  return (() => {
    const _el$ = _tmpl$0();              // clone the parsed template
    const _n$0 = _$nodeAt(_el$, [1]);    // walk to the <!> marker (2nd child)
    _$on(_el$, "click", () => count.set(count() + 1));
    _$insert(_n$0, () => count());        // fill the marker reactively
    return _el$;
  })();
}
```

Notice: the static `class="btn"` and the text `Count: ` stayed in the template string;
only the `{count()}` hole became a marker + an `insert`, and the `onClick` became an
`on`. The whole module body moved inside a `function (props)` — that's the
module-as-component model (see [transforms](#transformsts--module--per-instance-factory)).

---

## Pipeline

```
source .tsx
   │
   ▼  Parser            parse to a Babel AST
   ▼  TemplateLowerer   each JSX root → Template (static HTML + Part[])
   ▼  TemplateEmitter   Template → an IIFE AST that clones + wires the template
   ▼  FactoryTransform  wrap the module body in a (props) factory
   ▼  ModuleEmitter     prepend the runtime import + hoisted template constants
   ▼  Parser.generate   print the AST back to code + sourcemap
   ▼
output .js
```

The whole thing is orchestrated by [`Compiler`](#compilerts--the-orchestrator). Each
stage lives in its own file with one reason to change.

---

## The layers

### `index.ts` — public API

A thin entry point: `compile(code, filename?)` constructs a `Compiler` and runs it, plus
re-exports `Compiler` and the `CompileResult` type.

**Why a separate file:** consumers (the Vite plugin) should depend on a tiny, stable
surface, not the internal class graph.

### `parser.ts` — the Babel boundary (frontend)

`class Parser` wraps the three Babel calls the compiler needs — `parse`, `traverse`,
`generate` — and is the **only** place that knows Babel's ESM/CJS interop quirk
(`(_x as any).default ?? _x`).

**Why a separate file:** Babel is the one heavy external dependency. Isolating it here
means the rest of the compiler talks to a 3-method surface, and if Babel's import shape
or options ever change, exactly one file changes. (DIP — depend on a small abstraction,
not on Babel's whole API.)

### `lowering.ts` — JSX → IR

`class TemplateLowerer` walks one JSX root and produces a [`Template`](#irts--the-intermediate-representation).
It is split by concern so each method is a flat loop, not a deeply nested walk:

- `element` — assembles `<tag …attrs>…children</tag>` (or a void `<tag …>`).
- `attributes` — events (`onX`) and `{expr}` values become **parts**; plain
  string/boolean attributes stay in the static HTML.
- `children` — text stays inline; `{expr}` and child components become `<!>` markers
  backed by an insert part; nested elements recurse. Blank text and `{/* comments */}`
  are skipped and **consume no child index**, so the index always matches the real
  runtime `childNodes` position.
- `componentCall` / `prop` — a `<Capitalized />` element compiles to a **call**
  `Name({ … })`, with dynamic props emitted as **getters** so the child re-tracks them on
  every read.

Crucially, the lowerer keeps every dynamic expression as its **original Babel AST node**
— it never turns it back into text. The static-HTML helpers (`escapeText`, `escapeAttr`,
`normalizeText`, `normalizeAttrName`) and the void-element set
(`html-void-elements`) live here too.

**Why a separate file:** this is the semantic heart — the only part that understands JSX.
It has one job (interpret JSX into the IR) and is the place you touch to support new JSX
syntax.

### `ir.ts` — the intermediate representation

The decoupling layer between "what the markup means" and "what code to emit."

- `class Template { html: string; parts: Part[] }` — the lowered form of one root.
- `abstract class Part` — a dynamic hole at a `path`, with an `emit(ctx)` that returns the
  Babel **statement** wiring it. Subclasses own their own codegen:
  - `InsertPart` → `_$insert(ref, () => expr)` (dynamic) or `_$insert(ref, expr)` (a
    component call, inserted once).
  - `AttributePart` → `_$effect(() => _$setAttr(ref, "name", expr))`.
  - `EventPart` → `_$on(ref, "type", handler)`.
- `RUNTIME_HELPERS` — the single source of truth for the runtime helper names; the
  `RuntimeHelper` type is derived from it.

**Why a separate file (and why classes per part):** this is the **open/closed seam**.
Adding a new binding kind (say, a `class:foo` directive) is a new `Part` subclass — the
lowerer and the emitter don't change, because each part knows how to emit itself
(Strategy pattern). The lowerer depends only on `Part`, not on codegen; the emitter
depends only on `Part`, not on JSX. The `RuntimeUse` interface here (rather than importing
the concrete registry) is what keeps that dependency one-directional and cycle-free.

### `transforms.ts` — module → per-instance factory

`class FactoryTransform` rewrites a **wrapper-free** component module into a factory:

```tsx
const count = signal(0);          //  →  export default function (props) {
export default <view/>;           //       const count = signal(0);
                                  //       return <view/>;
                                  //     }
```

Imports, named exports, and type declarations stay at module scope (shared); everything
else moves inside the function so **each `<Counter/>` instance gets its own state**. If
the default export is already a function or class, it's treated as an explicit component
and left alone.

**Why a separate file:** this is an AST-level rewrite that has nothing to do with JSX
lowering or codegen — it operates on the whole `Program`. Behind a `ModuleTransform`
interface, it's also an extension point: future whole-module passes (e.g. auto-imports)
slot in beside it.

### `codegen.ts` — the backend

Turns the IR into Babel AST nodes (not strings). Three collaborators:

- `class RuntimeRegistry` — tracks which runtime helpers were actually used and hands out
  their aliased identifiers (`insert` → `_$insert`). `importDeclaration()` emits an import
  for **only the helpers used**, so a fully-static template pulls in just `template`.
- `class TemplateEmitter` — builds the per-root IIFE AST: clone the template, declare a
  `_n$i = _$nodeAt(_el$, [path])` for each referenced node, then one statement per part
  (`part.emit(...)`), then `return _el$`. A small `refName` closure allocates the `_n$`
  variables in part order.
- `class ModuleEmitter` — builds the module header AST: the runtime import + the hoisted
  `const _tmpl$i = _$template("…")` constants.

**Why a separate file, and why AST instead of strings:** an earlier version concatenated
JavaScript source strings, which meant every dynamic expression made a wasteful round
trip — the lowerer already had the AST, printed it back to text, embedded it in a bigger
string, and the orchestrator re-parsed the whole thing. Building AST directly (with
`@babel/types` builders) **splices the original expression nodes straight in**: no
re-parse, no manual quoting/escaping, and better sourcemaps (the spliced nodes keep their
original `loc`).

### `compiler.ts` — the orchestrator

`class Compiler` wires the stages and holds the per-compile state (`templates`,
`RuntimeRegistry`) in locals, so an instance is reusable and stateless. `compile()`:

1. parse to an AST;
2. traverse, and for each **root** JSX element (`isRoot` = no JSX ancestor): lower → emit
   IIFE → `path.replaceWith(iife)` → `path.skip()`. JSX fragments throw (not supported);
3. if any root was found, run `FactoryTransform` and `unshift` the header statements
   (import + template constants) onto the program body;
4. `generate` once → `{ code, map }`. A file with no JSX passes straight through.

**Why a separate file:** it's the composition root. The control flow (what runs, in what
order, only-if-JSX-present) is deterministic and lives in one readable place; the stages
stay independent and unaware of each other.

---

## Cross-cutting design decisions

### The runtime contract (why the compiler never imports the runtime's code)

The compiler only emits **named calls** — `template`, `nodeAt`, `insert`, `setAttr`, `on`
— aliased to `_$…`. It depends on the runtime's *names*, not its implementation. That's
what lets the runtime be swapped (e.g. a server/string renderer) without touching the
compiler, and it's why `RUNTIME_HELPERS` is a single declared list.

### Minimal imports

`RuntimeRegistry` exists so the emitted import lists only the helpers a given file uses.
It's not just tidiness — it keeps the dependency surface of generated modules honest and
lets dead helpers tree-shake.

### Node "strip-only" constraint

turbo ships packages as raw `.ts` (no build step). When Vite loads its config it pulls in
`@turbo/vite-plugin` → `@turbo/compiler` through **Node's strip-only TypeScript loader**,
which only erases types — it can't run TS features that need code generation. So this
package deliberately:

- uses **explicit `.ts` extensions** on relative imports (`./ir.ts`) — Node's native ESM
  resolver requires them;
- avoids **parameter properties** (`constructor(private x)`), enums, and namespaces —
  hence the explicit field declarations in the `Part` classes;
- builds output with **`@babel/types`** (a runtime value module), never `@babel/template`
  string templates that would need extra tooling.

### Why the IR exists at all

Two boundaries fall out of the `Template`/`Part` split: the lowerer can change how it
reads JSX without touching codegen, and the emitter can change how it writes code without
touching JSX. The IR is the contract between them — and the reason adding a binding kind
is additive rather than invasive.

---

## Limitations (today)

- **JSX fragments** (`<>…</>`) throw — not supported yet.
- **Spread** attributes/children are skipped.
- Expressions that themselves contain JSX (e.g. `{cond ? <a/> : <b/>}`) are not recursed
  into — the root is `skip()`ped after lowering.

---

## Tests

```bash
npx vitest run packages/compiler   # this package
npx vitest run                     # whole monorepo
```

[`index.test.ts`](src/index.test.ts) asserts on **substrings** of the emitted code
(normalizing whitespace), not byte-exact output — the AST is regenerated by Babel, so
formatting is Babel's to decide; what matters is that the right calls, markers, paths, and
factory wrapping are present.
