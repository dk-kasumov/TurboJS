import type { Plugin } from "vite";
import { compile } from "@turbo/compiler";

export function turbo(): Plugin {
  return {
    name: "turbo",
    enforce: "pre",
    transform(code, id) {
      const [filename] = id.split("?");
      if (!filename.endsWith(".tsx")) return null;
      
      const { code: out, map } = compile(code, filename);
      return { code: out, map };
    },
  };
}

export default turbo;
