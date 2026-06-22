import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const options = {
  entryPoints: { extension: "src/extension.ts" },
  bundle: true,
  outdir: "dist",
  platform: "node",
  format: "cjs",
  target: "node18",
  sourcemap: true,
  external: ["vscode"],
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
