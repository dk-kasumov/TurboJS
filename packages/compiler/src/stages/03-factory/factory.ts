import * as t from "@babel/types";
import {
  collectIO,
  findDefaultExport,
  isFactoryDeclaration,
  partitionModuleBody,
  type IOBinding,
} from "../../module-shape.ts";
import type { Unit } from "../../pipeline.ts";

const CORE_HELPER: Record<IOBinding["kind"], string> = {
  input: "_$input",
  inputRequired: "_$inputRequired",
  output: "_$output",
};

export function factory(unit: Unit): Unit {
  if (!unit.compiled) return unit;
  apply(unit.ast);
  return unit;
}

function apply(ast: t.File): void {
  const def = findDefaultExport(ast);
  if (!def) return;

  const decl = def.declaration;
  if (isFactoryDeclaration(decl)) return;
  if (!t.isExpression(decl)) return;

  const { keep, setup } = partitionModuleBody(ast.program.body, def);
  const io = collectIO(setup);
  const propsName = io.length ? "_$props" : "props";

  const helpers = new Set<string>();
  for (const binding of io) {
    helpers.add(CORE_HELPER[binding.kind]);
    binding.declarator.init = bind(binding, propsName);
  }

  const wrapper = t.functionDeclaration(
    null,
    [t.identifier(propsName)],
    t.blockStatement([...setup, t.returnStatement(decl)]),
  );

  ast.program.body = [
    ...keep,
    ...coreImport(helpers),
    t.exportDefaultDeclaration(wrapper),
  ];
}

function bind(binding: IOBinding, propsName: string): t.CallExpression {
  const props = t.identifier(propsName);
  const key = t.stringLiteral(binding.name);

  if (binding.kind === "output") {
    return t.callExpression(t.identifier("_$output"), [props, key]);
  }
  if (binding.kind === "inputRequired") {
    return t.callExpression(t.identifier("_$inputRequired"), [props, key]);
  }

  const arg = binding.call.arguments[0];
  const initial = arg && t.isExpression(arg) ? arg : t.identifier("undefined");
  return t.callExpression(t.identifier("_$input"), [props, key, initial]);
}

function coreImport(helpers: Set<string>): t.ImportDeclaration[] {
  if (helpers.size === 0) return [];
  const specifiers = [...helpers].map((h) =>
    t.importSpecifier(t.identifier(h), t.identifier(h)),
  );
  return [t.importDeclaration(specifiers, t.stringLiteral("@turbo/core"))];
}
