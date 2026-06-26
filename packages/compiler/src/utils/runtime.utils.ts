import * as t from "@babel/types";

export const RUNTIME_HELPERS = [
  "template", "insert", "effect", "setAttr", "on", "nodeAt", "createComponent",
] as const;

export type RuntimeHelper = (typeof RUNTIME_HELPERS)[number];

export const alias = (helper: RuntimeHelper): string => `_$${helper}`;

export interface RuntimeUse {
  use(helper: RuntimeHelper): t.Identifier;
}

export class HelperCollector implements RuntimeUse {
  readonly used = new Set<RuntimeHelper>();

  use(helper: RuntimeHelper): t.Identifier {
    this.used.add(helper);
    return t.identifier(alias(helper));
  }
}

export function runtimeImport(
  helpers: Set<RuntimeHelper>,
): t.ImportDeclaration | null {
  const used = RUNTIME_HELPERS.filter((h) => helpers.has(h));
  if (!used.length) return null;

  const specifiers = used.map((h) =>
    t.importSpecifier(t.identifier(alias(h)), t.identifier(h)),
  );
  return t.importDeclaration(specifiers, t.stringLiteral("@turbo/runtime"));
}
