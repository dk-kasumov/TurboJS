# 05 · generate

**in** — `Unit` (fully transformed AST)
**out** — `CompileResult` (`{ code, map }`)

Prints the final AST back to source text with `@babel/generator`, using the
original `unit.source` for source maps. The boundary back out of AST-land — the
mirror of stage 01.

```js
export default function (props) { const count = signal(0); return (() => { ... })(); }
```
becomes the emitted string (plus a source map back to the authored `.tsx`).
