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
