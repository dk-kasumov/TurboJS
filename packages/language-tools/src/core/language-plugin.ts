import type { LanguagePlugin, VirtualCode } from "@volar/language-core";
import type { TypeScriptServiceScript } from "@volar/typescript";
import { TurboVirtualCode } from "./virtual-code.ts";

export function createTurboLanguagePlugin<T>(
  ts: typeof import("typescript"),
): LanguagePlugin<T> {
  return {
    getLanguageId(scriptId) {
      if (String(scriptId).endsWith(".tsx")) return "turbo";
      return undefined;
    },
    createVirtualCode(_scriptId, languageId, snapshot) {
      if (languageId !== "turbo") return undefined;
      return new TurboVirtualCode(snapshot);
    },
    updateVirtualCode(_scriptId, virtualCode, snapshot) {
      return (virtualCode as TurboVirtualCode).update(snapshot);
    },
    typescript: {
      extraFileExtensions: [],
      getServiceScript(root: VirtualCode): TypeScriptServiceScript {
        return {
          code: root,
          extension: ".tsx",
          scriptKind: ts.ScriptKind.TSX,
        };
      },
    },
  };
}
