import * as path from "node:path";
import type ts from "typescript";
import { createLanguageServicePlugin } from "@volar/typescript/lib/quickstart/createLanguageServicePlugin";
import { createTurboLanguagePlugin, findStyleLink } from "@turbo/language-tools";

const base = createLanguageServicePlugin((ts) => ({
  languagePlugins: [createTurboLanguagePlugin<string>(ts)],
}));

const init: ts.server.PluginModuleFactory = (mod) => {
  const ts = mod.typescript;
  const pluginModule = base(mod);
  const create = pluginModule.create.bind(pluginModule);

  pluginModule.create = (info) => {
    const readOriginal = info.languageServiceHost.getScriptSnapshot.bind(
      info.languageServiceHost,
    );
    const ls = create(info);

    const styleDefinition = (
      fileName: string,
      position: number,
    ): ts.DefinitionInfoAndBoundSpan | undefined => {
      if (!fileName.endsWith(".tsx")) return undefined;
      const snapshot = readOriginal(fileName);
      if (!snapshot) return undefined;

      const source = snapshot.getText(0, snapshot.getLength());
      const link = findStyleLink(source, position);
      if (!link) return undefined;

      const target = path.resolve(path.dirname(fileName), link.specifier);
      if (!ts.sys.fileExists(target)) return undefined;

      return {
        textSpan: { start: link.start, length: link.end - link.start },
        definitions: [
          {
            fileName: target,
            textSpan: { start: 0, length: 0 },
            kind: ts.ScriptElementKind.moduleElement,
            name: link.specifier,
            containerName: "",
            containerKind: ts.ScriptElementKind.unknown,
          },
        ],
      };
    };

    return new Proxy(ls, {
      get(t, p, receiver) {
        if (p === "getDefinitionAndBoundSpan") {
          return (fileName: string, position: number) =>
            styleDefinition(fileName, position) ??
            t.getDefinitionAndBoundSpan(fileName, position);
        }
        if (p === "getDefinitionAtPosition") {
          return (fileName: string, position: number) =>
            styleDefinition(fileName, position)?.definitions ??
            t.getDefinitionAtPosition(fileName, position);
        }
        return Reflect.get(t, p, receiver);
      },
    });
  };

  return pluginModule;
};

export = init;
