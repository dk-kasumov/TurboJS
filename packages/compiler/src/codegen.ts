import * as t from "@babel/types";
import {
  Template,
  RUNTIME_HELPERS,
  type RuntimeHelper,
  type RuntimeUse,
} from "./ir.ts";

const alias = (helper: RuntimeHelper) => `_$${helper}`;

export class RuntimeRegistry implements RuntimeUse {
  private readonly used = new Set<RuntimeHelper>();

  use(helper: RuntimeHelper): t.Identifier {
    this.used.add(helper);
    return t.identifier(alias(helper));
  }

  importDeclaration(): t.ImportDeclaration | null {
    const used = RUNTIME_HELPERS.filter((h) => this.used.has(h));
    if (!used.length) return null;

    const specifiers = used.map((h) =>
      t.importSpecifier(t.identifier(alias(h)), t.identifier(h)),
    );

    return t.importDeclaration(specifiers, t.stringLiteral("@turbo/runtime"));
  }
}

export class TemplateEmitter {
  emit(template: Template, id: number, runtime: RuntimeRegistry): t.Expression {
    const refs = new Map<string, string>();

    const refName = (path: number[]): string => {
      if (path.length === 0) return "_el$";

      const key = JSON.stringify(path);
      let name = refs.get(key);

      if (!name) refs.set(key, (name = `_n$${refs.size}`));
      return name;
    };

    const stmts = template.parts.map((part) =>
      part.emit({ ref: t.identifier(refName(part.path)), runtime }),
    );

    const decls: t.Statement[] = [];

    for (const [key, name] of refs) {
      const path = JSON.parse(key) as number[];
      
      decls.push(
        t.variableDeclaration("const", [
          t.variableDeclarator(
            t.identifier(name),
            t.callExpression(runtime.use("nodeAt"), [
              t.identifier("_el$"),
              t.arrayExpression(path.map((n) => t.numericLiteral(n))),
            ]),
          ),
        ]),
      );
    }

    const body: t.Statement[] = [
      t.variableDeclaration("const", [
        t.variableDeclarator(
          t.identifier("_el$"),
          t.callExpression(t.identifier(`_tmpl$${id}`), []),
        ),
      ]),
      ...decls,
      ...stmts,
      t.returnStatement(t.identifier("_el$")),
    ];

    return t.callExpression(
      t.arrowFunctionExpression([], t.blockStatement(body)),
      [],
    );
  }
}

export class ModuleEmitter {
  headerStatements(runtime: RuntimeRegistry, templates: string[]): t.Statement[] {
    if (templates.length > 0) runtime.use("template");
    const tmplDecls = templates.map((html, i) =>
      t.variableDeclaration("const", [
        t.variableDeclarator(
          t.identifier(`_tmpl$${i}`),
          t.callExpression(t.identifier(alias("template")), [t.stringLiteral(html)]),
        ),
      ]),
    );

    const importDecl = runtime.importDeclaration();
    return importDecl ? [importDecl, ...tmplDecls] : tmplDecls;
  }
}
