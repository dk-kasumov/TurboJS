import * as t from "@babel/types";
import { alias } from "../utils/runtime.utils.ts";

const CSS_CONST = "_css$";

export function styleDecls(css: string): t.Statement[] {
  return [
    t.variableDeclaration("const", [
      t.variableDeclarator(t.identifier(CSS_CONST), t.stringLiteral(css)),
    ]),
    t.expressionStatement(
      t.callExpression(t.identifier(alias("useStyle")), [t.identifier(CSS_CONST)]),
    ),
  ];
}
