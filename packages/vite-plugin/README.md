# @turbo/vite-plugin

The Vite integration for turbo. It runs [`@turbo/compiler`](../compiler) as an
`enforce: "pre"` transform, so every `.tsx` is compiled to fine-grained DOM code **before**
esbuild sees the JSX.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { turbo } from "@turbo/vite-plugin";

export default defineConfig({
  esbuild: { jsx: "preserve" }, // we compile JSX away ourselves
  plugins: [turbo()],
});
```

The whole plugin is a thin `transform` hook: it matches `*.tsx`, calls `compile(code, id)`,
and returns the emitted code plus source map. Everything else is the compiler's job.
