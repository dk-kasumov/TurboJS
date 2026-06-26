import { defineConfig } from "vite";
import { turbo } from "@turbo/vite-plugin";

export default defineConfig({
  // Our plugin compiles JSX away; tell esbuild to leave JSX alone just in case.
  esbuild: { jsx: "preserve" },
  plugins: [turbo()],
  server: { port: 5180, strictPort: true },
  preview: { port: 5180, strictPort: true },
});
