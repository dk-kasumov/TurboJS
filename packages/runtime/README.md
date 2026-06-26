# @turbo/runtime

The DOM contract that [`@turbo/compiler`](../compiler) targets. It owns the DOM and decides
reactivity by running the compiler's thunks inside effects. It knows nothing about JSX.

The compiler emits calls into these helpers by name:

| | |
| --- | --- |
| `template(html)` | parse `html` once into a `<template>`; return a function that **clones** it per call |
| `nodeAt(root, path)` | walk `childNodes` by the compiler's numeric index path to a marker |
| `insert(marker, value)` | render `value` before the marker; if it's a thunk, run it in an effect and reconcile on change (in-place text update fast path; arrays flatten; `null`/booleans drop) |
| `setAttr(el, name, value)` | `null`/`false` removes, `true` sets `""`, else `String(value)` (always an attribute) |
| `on(el, type, handler)` | `addEventListener`, with the handler wrapped in `batch` so one event = one flush |
| `createComponent(c, props)` | resolve a component value — a function (called once, untracked), an accessor (kept reactive), or a Node (used as-is) |
| `render(component, container)` | mount under a `createRoot`; **returns a disposer** that unmounts and tears down the scope |

Reactivity is decided here, not in the compiler: a thunk passed to `insert` runs inside an
effect, so only the affected marker's nodes update — no virtual DOM, no component re-render.

```bash
npx vitest run packages/runtime   # DOM behaviour in happy-dom
```
