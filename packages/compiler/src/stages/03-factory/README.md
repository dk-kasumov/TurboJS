# 03 · factory

**in** — `Unit` (module body still at top level)
**out** — `Unit` (module wrapped into a per-instance factory function)

Implements turbo's core trick: *the module is the component*. Setup statements
live at the top level in source, but each `<Counter />` needs its own state — so
this stage wraps the body into `function (props) { …setup…; return view; }`.

Skips entirely when `compiled` is false (a module with no JSX root is left
untouched). Uses the shared `module-shape` helpers to decide what stays at
module scope vs. what moves inside.

```js
import { signal } from "@turbo/reactivity";   // import → stays outside
const count = signal(0);                        // setup → moves inside
export default (() => { ... })();               // the IIFE from stage 02
```
becomes
```js
import { signal } from "@turbo/reactivity";
export default function (props) {
  const count = signal(0);
  return (() => { ... })();
}
```

If a setup binding is `input(...)` / `input.required(...)` / `output()`, its
initializer is rewritten to `_$input(props, "name", …)` etc. and an
`@turbo/core` import is added.
