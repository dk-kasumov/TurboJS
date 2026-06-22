import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import ts from "typescript";
import {
  createLanguage,
  FileMap,
  type IScriptSnapshot,
  type Language,
} from "@volar/language-core";
import {
  decorateLanguageServiceHost,
  createProxyLanguageService,
  resolveFileLanguageId,
} from "@volar/typescript";
import { createTurboLanguagePlugin } from "../core/language-plugin";

function snapshot(text: string): IScriptSnapshot {
  return {
    getText: (start, end) => text.slice(start, end),
    getLength: () => text.length,
    getChangeRange: () => undefined,
  };
}

function buildService(tsconfigRel: string): {
  ls: ts.LanguageService;
  tsxFiles: string[];
} {
  const configPath = path.resolve(tsconfigRel);
  const cfg = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    cfg.config,
    ts.sys,
    path.dirname(configPath),
  );

  let language: Language<string>;
  language = createLanguage<string>(
    [
      createTurboLanguagePlugin<string>(ts),
      { getLanguageId: (id) => resolveFileLanguageId(id) },
    ],
    new FileMap(ts.sys.useCaseSensitiveFileNames),
    (fileName) => {
      const text = ts.sys.readFile(fileName);
      if (text !== undefined) language.scripts.set(fileName, snapshot(text));
      else language.scripts.delete(fileName);
    },
  );

  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => parsed.options,
    getScriptFileNames: () => parsed.fileNames,
    getScriptVersion: () => "0",
    getScriptSnapshot: (fileName) => {
      const text = ts.sys.readFile(fileName);
      return text !== undefined ? snapshot(text) : undefined;
    },
    getCurrentDirectory: () => path.dirname(configPath),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    readFile: ts.sys.readFile,
    fileExists: ts.sys.fileExists,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };

  decorateLanguageServiceHost(ts, language, host);
  const { proxy, initialize } = createProxyLanguageService(
    ts.createLanguageService(host),
  );
  initialize(language);

  return {
    ls: proxy,
    tsxFiles: parsed.fileNames.filter((f) => f.endsWith(".tsx")),
  };
}

function authoredSlice(d: ts.Diagnostic): string {
  const text = fs.readFileSync(d.file!.fileName, "utf8");
  return text.slice(d.start!, d.start! + d.length!);
}

const FIXTURES = "packages/language-tools/test/fixtures";

describe("editor path (TypeScript language service plugin)", () => {
  it("reports no semantic errors for a correct magic-props component + call site", () => {
    const { ls, tsxFiles } = buildService(`${FIXTURES}/pass/tsconfig.json`);
    for (const file of tsxFiles) {
      const messages = ls
        .getSemanticDiagnostics(file)
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
      expect(messages, file).toEqual([]);
    }
  });

  it("does not report ts(2604) 'no call signatures' on a component element", () => {
    const { ls } = buildService(`${FIXTURES}/pass/tsconfig.json`);
    const app = path.resolve(`${FIXTURES}/pass/App.tsx`);
    const codes = ls.getSemanticDiagnostics(app).map((d) => d.code);
    expect(codes).not.toContain(2604);
  });

  it("reports mapped prop errors at the authored call site", () => {
    const { ls } = buildService(`${FIXTURES}/fail/tsconfig.json`);
    const app = path.resolve(`${FIXTURES}/fail/App.tsx`);
    const diagnostics = ls.getSemanticDiagnostics(app);
    expect(diagnostics.length).toBeGreaterThanOrEqual(3);
    const tokens = diagnostics.map(authoredSlice);
    expect(tokens).toContain("Header");
    expect(tokens).toContain("title");
    expect(tokens).toContain("bogus");
  });
});
