import type { Plugin } from "vite";
import { compile } from "@turbo/compiler";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function turbo(): Plugin {
  return {
    name: "turbo",
    enforce: "pre",
    transform(code, id) {
      const [filename] = id.split("?");
      if (!filename.endsWith(".tsx")) return null;

      const resolveStyle = (path: string): string => {
        const abs = resolve(dirname(filename), path);
        this.addWatchFile(abs);
        return readFileSync(abs, "utf8");
      };

      const { code: out, map } = compile(code, filename, { resolveStyle });
      return { code: out, map };
    },
  };
}

export default turbo;
