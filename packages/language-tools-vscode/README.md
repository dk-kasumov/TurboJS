# @turbo/vscode

A thin VS Code extension that makes the built-in TypeScript service turbo-aware.

It contributes [`@turbo/typescript-plugin`](../typescript-plugin) via
`contributes.typescriptServerPlugins`, so the same service that already handles `.tsx` feeds
each file through the Volar virtual-code layer in [`@turbo/language-tools`](../language-tools).
The result is hover, completion, go-to-definition, and prop type errors on turbo
components — with no second language server and no conflicting diagnostics. (A standalone
server would double-report on the same `.tsx` and surface false errors like
`ts(2604) 'Header' does not have any construct or call signatures`.)

## Build & run

```sh
pnpm --filter @turbo/typescript-plugin build   # the plugin (index.js)
pnpm --filter @turbo/vscode build              # the extension (dist/extension.js)
```

Open this folder in VS Code and press `F5`. It activates on `typescriptreact` files and
injects the plugin (for both the bundled and workspace TypeScript versions).

For setup without the extension, or for CI, see
[`@turbo/typescript-plugin`](../typescript-plugin) and `turbo-check`.
