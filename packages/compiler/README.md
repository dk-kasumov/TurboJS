# @turbo/compiler

Turns a `.tsx` module into plain DOM-building JavaScript wired to signals. JSX is read
**as a parser, not a runtime** (the Solid / dom-expressions approach): every JSX root
collapses into a static HTML template plus a few imperative calls into `@turbo/runtime`.

```ts
import { compile } from "@turbo/compiler";

const { code, map } = compile(source, "Button.tsx");
```

## The one idea

Every JSX root splits into:

1. **one static HTML string** — the parts that never change, with a `<!>` marker at each
   dynamic hole;
2. **a list of parts** — the holes, each located by a numeric child-index path and carrying
   the original expression.

At runtime the HTML is parsed once into a `<template>` and cloned per instance; markers are
walked to by index and filled. The compiler wraps every dynamic expression in a thunk
`() => expr` and hands it to the runtime — **it never decides what is reactive.**

```tsx
const count = signal(0);
export default <button onClick={() => count.set(count() + 1)}>{count()}</button>;
```
```js
import { template as _$template, insert as _$insert, on as _$on, nodeAt as _$nodeAt } from "@turbo/runtime";
const _tmpl$0 = _$template("<button><!></button>");
export default function (props) {
  const count = signal(0);
  return (() => {
    const _el$ = _tmpl$0();
    const _n$0 = _$nodeAt(_el$, [0]);
    _$on(_el$, "click", () => count.set(count() + 1));
    _$insert(_n$0, () => count());
    return _el$;
  })();
}
```

## Pipeline

`compile()` runs five stages over one `Unit` (the compilation state). Each stage lives in
its own folder under [`src/stages`](src/stages) with a README:

```
01-parse     source .tsx → Babel AST + a fresh Unit
02-lower     every JSX root → DOM-building IIFE; fills templates + helpers used
03-factory   wrap the module body into a per-instance (props) factory; bind input/output
04-header    prepend the runtime import + hoisted `const _tmpl$N = _$template(...)`
05-generate  print the AST back to code + source map
```

The seam between stages is the `Unit` — stage 04 reads what stage 02 collected without
importing it. Lowering recurses into expressions, so JSX inside `{cond ? <A/> : <B/>}` and
`{items.map(x => <li/>)}` lowers too. A `<Capitalized />` root becomes a
`createComponent(Foo, {...})` call; dynamic props become getters so the child stays reactive.

The IR (`stages/02-lower/ir.ts`) is the open/closed seam: a new binding kind is a new `Part`
that knows how to `emit()` itself — the lowerer and emitter don't change.

## Conventions (the package ships raw `.ts`)

Vite loads this through Node's strip-only TS loader, so the source uses **explicit `.ts`
import extensions**, avoids parameter properties / enums / namespaces, and builds output
with `@babel/types` (splicing original expression nodes in — no re-parse, better maps).

## Limitations

- JSX **fragments** (`<>…</>`) throw — not supported yet.
- **Spread** attributes/children are skipped.
- Component **children** are dropped (no slots).

## Tests

```bash
npx vitest run packages/compiler
```

Tests assert on **whitespace-normalized substrings** of the output and re-`parse()` it to
prove no leftover JSX — never byte-exact formatting (Babel owns that).
