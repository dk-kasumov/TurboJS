# 02 · lower

**in** — `Unit` (ast still contains raw JSX)
**out** — `Unit` (every JSX root replaced by DOM-building code; `templates` + `helpers` filled; `compiled = true`)

The heart of the compiler. Walks the AST, and for every **render root** (a JSX
element with no JSX parent) rewrites it into plain JS that builds the DOM by hand.

Internally it works in two passes over each root:

1. **lower** (`TemplateLowerer`, AST → IR `Template`) — splits static structure
   from dynamic holes. Static tags/text/attrs concatenate into an HTML string;
   each dynamic piece becomes a `Part` — a plain `{ kind }` object (`insert` /
   `attribute` / `event` / `component`) carrying a numeric child-path.
2. **emit** (`TemplateEmitter`, IR → IIFE) — turns the `Template` back into an
   AST expression that clones the template and wires the holes. `emitPart`
   dispatches each `Part` through a registry keyed by `kind` (open for
   extension), recording the runtime helpers it needs into a `HelperCollector`.

```jsx
<button onClick={() => count.set(count() + 1)}>{count()}</button>
```
becomes (and `templates += "<button><!></button>"`, `helpers += {nodeAt, on, insert}`)
```js
(() => {
  const _el$ = _tmpl$0();
  const _n$0 = _$nodeAt(_el$, [0]);
  _$on(_el$, "click", () => count.set(count() + 1));
  _$insert(_n$0, () => count());
  return _el$;
})()
```

A bare `<Foo a={x} />` root lowers to a `createComponent(Foo, {...})` call
instead of a template. Fragments (`<>…</>`) throw — not supported yet.

`ir.ts` is **only** used inside this stage; no other layer imports it.
