# @turbo/vscode

VS Code extension that makes the built-in TypeScript service turbo-aware.

It contributes [`@turbo/typescript-plugin`](../typescript-plugin) via
`contributes.typescriptServerPlugins`, so VS Code's own TypeScript language
service feeds each `.tsx` through the Volar virtual-code layer in
[`@turbo/language-tools`](../language-tools). The result: hover, completion,
go-to-definition, and prop type errors work on turbo components inside the *same*
service that already handles `.tsx` — no second language server, no conflicting
diagnostics.

## Why a TypeScript plugin (not a separate server)

turbo reuses the `.tsx` extension that VS Code's built-in TypeScript service
already owns. A standalone language server would run *alongside* that service and
both would report on the same file — the built-in one seeing the raw source
(magic `props`, bare-expression default export) and emitting false errors such as
`ts(2604) 'Header' does not have any construct or call signatures`. A TypeScript
plugin instead hooks *into* the existing service so there is a single,
turbo-aware view.

## Build

```sh
pnpm --filter @turbo/typescript-plugin build   # produces index.js (the plugin)
pnpm --filter @turbo/vscode build              # produces dist/extension.js
```

## Run

Open this folder in VS Code and press `F5`. The extension activates on
`typescriptreact` documents and injects the plugin into the TypeScript server
(`enableForWorkspaceTypeScriptVersions: true` lets it load for both the bundled
and the workspace TypeScript versions).

## Without the extension

Add the plugin directly in your `tsconfig.json` and select **TypeScript: Select
TypeScript Version → Use Workspace Version**:

```json
{
  "compilerOptions": {
    "plugins": [{ "name": "@turbo/typescript-plugin" }]
  }
}
```

For CI / headless type-checking, use [`turbo-check`](../language-tools) — same
virtual-code layer, same diagnostics.
