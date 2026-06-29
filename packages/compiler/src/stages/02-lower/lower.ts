import * as t from "@babel/types";
import type { JSXElement, JSXFragment } from "@babel/types";
import type { NodePath } from "@babel/traverse";
import { traverse } from "../../utils/babel.utils.ts";
import { HelperCollector, type RuntimeUse } from "../../utils/runtime.utils.ts";
import type { Unit } from "../../pipeline.ts";
import {
  Template,
  Part,
  InsertPart,
  ComponentPart,
  AttributePart,
  EventPart,
  createComponentCall,
} from "./ir.ts";
import {
  elementName,
  escapeAttr,
  escapeText,
  eventType,
  isComponentElement,
  isEventName,
  isRenderRoot,
  normalizeText,
  readAttr,
  VOID_ELEMENTS,
} from "../../utils/ast.utils.ts";

class TemplateLowerer {
  private readonly scopeAttr: string | null;

  constructor(scopeAttr: string | null = null) {
    this.scopeAttr = scopeAttr;
  }

  lower(root: JSXElement): Template {
    const parts: Part[] = [];
    const html = this.element(root, [], parts);
    return new Template(html, parts);
  }

  private element(node: JSXElement, path: number[], parts: Part[]): string {
    const tag = elementName(node);
    const attrs = this.attributes(node, path, parts);
    const stamp = this.scopeAttr ? ` ${this.scopeAttr}` : "";
    const children = this.children(node, path, parts);
    return VOID_ELEMENTS.has(tag)
      ? `<${tag}${attrs}${stamp}>`
      : `<${tag}${attrs}${stamp}>${children}</${tag}>`;
  }

  private attributes(node: JSXElement, path: number[], parts: Part[]): string {
    let html = "";
    for (const attr of node.openingElement.attributes) {
      const read = readAttr(attr);
      if (!read) continue;

      const { name, value } = read;

      if (isEventName(name)) {
        const handler =
          value.kind === "dynamic" ? value.expr : t.identifier("undefined");
        parts.push(new EventPart(path, eventType(name), handler));
        continue;
      }

      if (value.kind === "dynamic") {
        parts.push(new AttributePart(path, name, value.expr));
        continue;
      }

      if (value.kind === "boolean") {
        html += ` ${name}`;
        continue;
      }

      if (value.kind === "static") {
        html += ` ${name}="${escapeAttr(value.value)}"`;
      }
    }

    return html;
  }

  private children(node: JSXElement, path: number[], parts: Part[]): string {
    let html = "";
    let index = 0;

    for (const child of node.children) {
      const childPath = path.concat(index);

      if (child.type === "JSXText") {
        const text = normalizeText(child.value);
        if (text === "") continue;
        html += escapeText(text);
      } else if (child.type === "JSXExpressionContainer") {
        if (!t.isExpression(child.expression)) continue;
        html += "<!>";
        parts.push(new InsertPart(childPath, child.expression, true));
      } else if (child.type === "JSXElement") {
        html += this.childElement(child, childPath, parts);
      } else if (child.type === "JSXFragment") {
        throw new Error("turbo: JSX fragments are not supported yet");
      } else {
        continue;
      }

      index++;
    }

    return html;
  }

  private childElement(node: JSXElement, path: number[], parts: Part[]): string {
    if (isComponentElement(node)) {
      parts.push(
        new ComponentPart(path, elementName(node), this.componentProps(node)),
      );

      return "<!>";
    }

    return this.element(node, path, parts);
  }

  componentProps(node: JSXElement): t.ObjectExpression {
    const props: (t.ObjectProperty | t.ObjectMethod)[] = [];

    for (const attr of node.openingElement.attributes) {
      const read = readAttr(attr);
      if (!read) continue;

      const { name, value } = read;
      const key = t.stringLiteral(name);

      if (value.kind === "boolean") {
        props.push(t.objectProperty(key, t.booleanLiteral(true)));
      } else if (value.kind === "dynamic") {
        props.push(
          t.objectMethod(
            "get",
            key,
            [],
            t.blockStatement([t.returnStatement(value.expr)]),
          ),
        );
      } else if (value.kind === "static") {
        props.push(t.objectProperty(key, t.stringLiteral(value.value)));
      }
    }

    return t.objectExpression(props);
  }
}

class TemplateEmitter {
  emit(template: Template, id: number, runtime: RuntimeUse): t.Expression {
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

export function lower(unit: Unit): Unit {
  const lowerer = new TemplateLowerer(unit.scope?.attr ?? null);
  const emitter = new TemplateEmitter();
  const collector = new HelperCollector();

  traverse(unit.ast, {
    JSXElement: {
      exit: (path: NodePath<JSXElement>) => {
        if (!isRenderRoot(path)) return;
        unit.compiled = true;

        if (isComponentElement(path.node)) {
          const call = createComponentCall(
            elementName(path.node),
            lowerer.componentProps(path.node),
            collector,
          );
          path.replaceWith(call);
          return;
        }

        const template = lowerer.lower(path.node);
        const iife = emitter.emit(template, unit.templates.length, collector);
        unit.templates.push(template.html);
        path.replaceWith(iife);
      },
    },
    JSXFragment: {
      exit: (path: NodePath<JSXFragment>) => {
        if (!isRenderRoot(path)) return;
        throw new Error("turbo: JSX fragments are not supported yet");
      },
    },
  });

  unit.helpers = collector.used;
  return unit;
}
