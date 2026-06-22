import * as t from "@babel/types";
import {
  findDefaultExport,
  isFactoryDeclaration,
  partitionModuleBody,
} from "./module-shape.ts";

export interface ModuleTransform {
  apply(file: t.File): void;
}

export class FactoryTransform implements ModuleTransform {
  apply(ast: t.File): void {
    const def = findDefaultExport(ast);
    if (!def) return;

    const decl = def.declaration;
    if (isFactoryDeclaration(decl)) return;
    if (!t.isExpression(decl)) return;

    const { keep, setup } = partitionModuleBody(ast.program.body, def);

    const factory = t.functionDeclaration(
      null,
      [t.identifier("props")],
      t.blockStatement([...setup, t.returnStatement(decl)]),
    );

    ast.program.body = [...keep, t.exportDefaultDeclaration(factory)];
  }
}
