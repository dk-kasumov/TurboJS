# @turbo/language-tools

Type-checking for turbo's "magic". The hard part: `props` is never declared, yet
`<Header title="x" />` must type-check against `Header`'s props even though `Header.tsx` has
no function signature.

The fix is a **Volar virtual code** layer. Each authored `.tsx` is transformed into a
type-checkable virtual TSX with 1:1 source mappings, so diagnostics land on the authored
token:

```tsx
interface Props { title: string }        const __turbo_default =
export default                     ──▶      (props: Props): JSX.Element =>
  <h1>{props.title}</h1>;                    { return <h1>{props.title}</h1>; };
                                           export default __turbo_default;
```

The props type is found by convention: a top-level `interface`/`type Props`, else a type
derived from `input()`/`output()` bindings, else `TurboProps` (unchecked). Syntax errors and
non-magic modules fall back to identity (passed through unchanged).

The same transform feeds two consumers:

- **`turbo-check` CLI** — `check(tsconfig)` runs a real `ts.Program` and reports config /
  syntactic / semantic diagnostics. Run it with `node src/check/cli.ts <tsconfig.json>`.
- **Editor** — wrapped as a TS Server plugin by [`@turbo/typescript-plugin`](../typescript-plugin).

`lib/turbo.d.ts` declares the global `JSX` namespace (intrinsic elements, event handlers,
`JSX.Element = Node`) and `TurboProps`.

```bash
npx vitest run packages/language-tools   # both the program and editor paths
```
