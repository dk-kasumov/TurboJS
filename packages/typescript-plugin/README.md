# @turbo/typescript-plugin

Wraps [`@turbo/language-tools`](../language-tools) as a **TypeScript Server plugin**, so the
editor's existing `.tsx` language service becomes turbo-aware — hover, completion,
go-to-definition, and prop errors all work on the authored source.

Because turbo reuses the `.tsx` extension TypeScript already owns, a plugin (not a separate
language server) is the right shape: it hooks *into* the one service instead of running
alongside it and double-reporting. This is what suppresses false errors like
`ts(2604) 'Header' does not have any construct or call signatures` on the raw source.

Enable it in `tsconfig.json` (and select the workspace TypeScript version):

```json
{ "compilerOptions": { "plugins": [{ "name": "@turbo/typescript-plugin" }] } }
```

It ships an esbuild → CJS build (`pnpm --filter @turbo/typescript-plugin build`). For
editor wiring see [`@turbo/vscode`](../language-tools-vscode); for CI use `turbo-check`.
