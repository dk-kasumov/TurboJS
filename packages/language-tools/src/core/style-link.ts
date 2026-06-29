import { parse } from "@babel/parser";
import * as t from "@babel/types";

export interface StyleLink {
  specifier: string;
  start: number;
  end: number;
}

function configObject(stmt: t.Statement): t.ObjectExpression | null {
  const decl = t.isExportNamedDeclaration(stmt) ? stmt.declaration : stmt;
  if (!decl || !t.isVariableDeclaration(decl)) return null;
  for (const d of decl.declarations) {
    if (!t.isIdentifier(d.id, { name: "config" }) || !d.init) continue;
    const init = t.isCallExpression(d.init) ? d.init.arguments[0] : d.init;
    if (init && t.isObjectExpression(init)) return init;
  }
  return null;
}

function styleStrings(object: t.ObjectExpression): t.StringLiteral[] {
  for (const prop of object.properties) {
    if (!t.isObjectProperty(prop) || prop.computed) continue;
    const key = t.isIdentifier(prop.key)
      ? prop.key.name
      : t.isStringLiteral(prop.key)
        ? prop.key.value
        : null;
    if (key !== "styles") continue;
    const values = t.isArrayExpression(prop.value)
      ? prop.value.elements
      : [prop.value];
    return values.filter((v): v is t.StringLiteral => !!v && t.isStringLiteral(v));
  }
  return [];
}

export function findStyleLink(source: string, offset: number): StyleLink | null {
  let ast;
  try {
    ast = parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] });
  } catch {
    return null;
  }

  for (const stmt of ast.program.body) {
    const object = configObject(stmt);
    if (!object) continue;
    for (const node of styleStrings(object)) {
      if (node.start == null || node.end == null) continue;
      if (offset >= node.start && offset <= node.end) {
        return { specifier: node.value, start: node.start, end: node.end };
      }
    }
  }
  return null;
}
