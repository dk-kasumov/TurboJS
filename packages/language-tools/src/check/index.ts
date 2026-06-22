import * as path from "node:path";
import ts from "typescript";
import { proxyCreateProgram } from "@volar/typescript";
import { createTurboLanguagePlugin } from "../core/language-plugin.ts";

export interface CheckResult {
  diagnostics: ts.Diagnostic[];
  errorCount: number;
  format(): string;
}

export function check(tsconfigPath: string): CheckResult {
  const configPath = path.resolve(tsconfigPath);
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) return toResult([configFile.error]);

  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  );

  const createProgram = proxyCreateProgram(
    ts,
    ts.createProgram,
    (tsModule) => [createTurboLanguagePlugin<string>(tsModule)],
  );

  const program = createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
    host: ts.createCompilerHost(parsed.options),
  });

  const diagnostics = [
    ...parsed.errors,
    ...program.getSyntacticDiagnostics(),
    ...program.getGlobalDiagnostics(),
    ...program.getSemanticDiagnostics(),
  ];

  return toResult(diagnostics);
}

function toResult(diagnostics: ts.Diagnostic[]): CheckResult {
  const errorCount = diagnostics.filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  ).length;

  return {
    diagnostics,
    errorCount,
    format() {
      return ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => process.cwd(),
        getCanonicalFileName: (fileName) => fileName,
        getNewLine: () => "\n",
      });
    },
  };
}
