import { createHash } from "node:crypto";
import * as t from "@babel/types";
import { staticValue } from "./utils/ast-value.ts";
import { strategyFor } from "./encapsulation/strategy.ts";
import type { CompileOptions, Unit } from "./pipeline.ts";

interface RawConfig {
  encapsulation?: unknown;
  styles?: string | string[];
}

function findConfig(
  body: t.Statement[],
): { object: t.Expression; statement: t.Statement } | null {
  for (const stmt of body) {
    if (!t.isExportNamedDeclaration(stmt) || !stmt.declaration) continue;
    if (!t.isVariableDeclaration(stmt.declaration)) continue;
    for (const decl of stmt.declaration.declarations) {
      if (!t.isIdentifier(decl.id, { name: "config" }) || !decl.init) continue;
      const object = t.isCallExpression(decl.init)
        ? decl.init.arguments[0]
        : decl.init;
      if (object && t.isExpression(object)) return { object, statement: stmt };
    }
  }

  return null;
}

function scopeId(filename: string): string {
  return "t-" + createHash("sha256").update(filename).digest("hex").slice(0, 8);
}

function styleList(styles: string | string[] | undefined): string[] {
  if (styles == null) return [];
  
  const list = Array.isArray(styles) ? styles : [styles];
  return list.filter((s): s is string => typeof s === "string");
}

export function scope(unit: Unit, options: CompileOptions): Unit {
  const found = findConfig(unit.ast.program.body);
  if (!found) return unit;

  unit.ast.program.body = unit.ast.program.body.filter(
    (stmt) => stmt !== found.statement,
  );

  const config = staticValue(found.object) as RawConfig;
  const paths = styleList(config.styles);
  if (paths.length === 0) return unit;

  const resolve = options.resolveStyle;
  if (!resolve) {
    throw new Error(
      "turbo: component() declares styles but no resolveStyle was provided to compile()",
    );
  }

  const strategy = strategyFor(config.encapsulation);
  const id = scopeId(unit.filename);
  const raw = paths.map(resolve).join("\n");

  unit.scope = {
    attr: strategy.attribute(id),
    css: strategy.transformCss(raw, id),
  };

  return unit;
}
