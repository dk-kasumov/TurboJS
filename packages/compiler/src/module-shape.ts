import * as t from "@babel/types";

export interface ModulePartition {
  keep: t.Statement[];
  setup: t.Statement[];
}

export function findDefaultExport(
  file: t.File,
): t.ExportDefaultDeclaration | undefined {
  return file.program.body.find((n) => t.isExportDefaultDeclaration(n)) as
    | t.ExportDefaultDeclaration
    | undefined;
}

export function isFactoryDeclaration(node: t.Node): boolean {
  return (
    t.isFunctionDeclaration(node) ||
    t.isFunctionExpression(node) ||
    t.isArrowFunctionExpression(node) ||
    t.isClassDeclaration(node)
  );
}

function isKeepStatement(node: t.Statement): boolean {
  return (
    t.isImportDeclaration(node) ||
    t.isExportNamedDeclaration(node) ||
    t.isExportAllDeclaration(node) ||
    t.isTSTypeAliasDeclaration(node) ||
    t.isTSInterfaceDeclaration(node)
  );
}

export function partitionModuleBody(
  body: t.Statement[],
  def: t.ExportDefaultDeclaration,
): ModulePartition {
  const keep: t.Statement[] = [];
  const setup: t.Statement[] = [];
  for (const node of body) {
    if (node === def) continue;
    if (isKeepStatement(node)) keep.push(node);
    else setup.push(node);
  }
  return { keep, setup };
}

export type IOKind = "input" | "inputRequired" | "output";

export interface IOBinding {
  name: string;
  kind: IOKind;
  declarator: t.VariableDeclarator;
  call: t.CallExpression;
}

function ioKind(callee: t.Node): IOKind | null {
  if (t.isIdentifier(callee)) {
    if (callee.name === "input") return "input";
    if (callee.name === "output") return "output";
    return null;
  }
  if (
    t.isMemberExpression(callee) &&
    !callee.computed &&
    t.isIdentifier(callee.object, { name: "input" }) &&
    t.isIdentifier(callee.property, { name: "required" })
  ) {
    return "inputRequired";
  }
  return null;
}

export function collectIO(setup: t.Statement[]): IOBinding[] {
  const bindings: IOBinding[] = [];
  for (const stmt of setup) {
    if (!t.isVariableDeclaration(stmt)) continue;
    for (const declarator of stmt.declarations) {
      if (!t.isIdentifier(declarator.id)) continue;
      if (!declarator.init || !t.isCallExpression(declarator.init)) continue;
      const kind = ioKind(declarator.init.callee);
      if (!kind) continue;
      bindings.push({
        name: declarator.id.name,
        kind,
        declarator,
        call: declarator.init,
      });
    }
  }
  return bindings;
}
