import * as t from "@babel/types";

export function staticValue(node: t.Node): unknown {
  if (
    t.isStringLiteral(node) ||
    t.isNumericLiteral(node) ||
    t.isBooleanLiteral(node)
  ) {
    return node.value;
  }

  if (t.isArrayExpression(node)) {
    return node.elements.map((el) => (el ? staticValue(el) : null));
  }

  if (t.isObjectExpression(node)) {
    const out: Record<string, unknown> = {};
    for (const prop of node.properties) {
      if (!t.isObjectProperty(prop) || prop.computed) continue;
      const key = t.isIdentifier(prop.key)
        ? prop.key.name
        : t.isStringLiteral(prop.key)
          ? prop.key.value
          : null;
      if (key !== null) out[key] = staticValue(prop.value);
    }
    return out;
  }

  if (t.isMemberExpression(node) && !node.computed && t.isIdentifier(node.property)) {
    return node.property.name;
  }

  if (t.isIdentifier(node)) return node.name;

  throw new Error("turbo: component() config must be statically analyzable");
}
