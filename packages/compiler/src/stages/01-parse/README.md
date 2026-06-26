# 01 · parse

**in** — `source: string` (the authored `.tsx`)
**out** — `Unit` (a fresh compilation unit)

Turns source text into a Babel AST and seeds the `Unit` that travels down the
pipeline. No transformation yet — every later stage reads and mutates this `Unit`.

```
import { signal } from "@turbo/reactivity";
const count = signal(0);
export default <button onClick={...}>{count()}</button>;
```
becomes
```ts
Unit {
  source,                 // kept for source maps in stage 05
  filename,
  ast,                    // the parsed tree
  templates: [],          // filled by 02-lower
  helpers:   Set {},      // filled by 02-lower
  compiled:  false,       // flipped by 02-lower when a JSX root is found
}
```
