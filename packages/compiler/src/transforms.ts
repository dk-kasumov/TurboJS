import * as t from "@babel/types";

export interface ModuleTransform {
  apply(file: t.File): void;
}

export class FactoryTransform implements ModuleTransform {
  apply(ast: t.File): void {
    const body = ast.program.body;
    const def = body.find((n) => t.isExportDefaultDeclaration(n)) as
      | t.ExportDefaultDeclaration
      | undefined;
    if (!def) return;

    const decl = def.declaration;
    if (
      t.isFunctionDeclaration(decl) ||
      t.isFunctionExpression(decl) ||
      t.isArrowFunctionExpression(decl) ||
      t.isClassDeclaration(decl)
    ) {
      return;
    }

    if (!t.isExpression(decl)) return;

    const keep: t.Statement[] = [];
    const setup: t.Statement[] = [];

    for (const node of body) {
      if (node === def) continue;
      if (
        t.isImportDeclaration(node) ||
        t.isExportNamedDeclaration(node) ||
        t.isExportAllDeclaration(node) ||
        t.isTSTypeAliasDeclaration(node) ||
        t.isTSInterfaceDeclaration(node)
      )
        keep.push(node);
      else setup.push(node);
    }

    const factory = t.functionDeclaration(
      null,
      [t.identifier("props")],
      t.blockStatement([...setup, t.returnStatement(decl)]),
    );
    
    ast.program.body = [...keep, t.exportDefaultDeclaration(factory)];
  }
}
