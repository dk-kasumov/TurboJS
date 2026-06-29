import * as t from "@babel/types";
import {
  alias,
  runtimeImport,
  type RuntimeHelper,
} from "../../utils/runtime.utils.ts";
import { styleDecls } from "../../encapsulation/inject.ts";
import type { Unit } from "../../pipeline.ts";

export function header(unit: Unit): Unit {
  if (!unit.compiled) return unit;

  const helpers = new Set<RuntimeHelper>(unit.helpers);
  if (unit.templates.length > 0) helpers.add("template");
  if (unit.scope) helpers.add("useStyle");

  const runtime = runtimeImport(helpers);
  const styles = unit.scope ? styleDecls(unit.scope.css) : [];
  const declarations = unit.templates.map(templateDecl);
  const head = [...(runtime ? [runtime] : []), ...styles, ...declarations];

  unit.ast.program.body.unshift(...head);
  return unit;
}

function templateDecl(html: string, id: number): t.VariableDeclaration {
  return t.variableDeclaration("const", [
    t.variableDeclarator(
      t.identifier(`_tmpl$${id}`),
      t.callExpression(t.identifier(alias("template")), [t.stringLiteral(html)]),
    ),
  ]);
}
