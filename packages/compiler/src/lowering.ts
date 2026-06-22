import * as t from "@babel/types";
import type {
  JSXElement,
  JSXAttribute,
  JSXSpreadAttribute,
  JSXExpressionContainer,
} from "@babel/types";
import { htmlVoidElements } from "html-void-elements";
import {
  Template,
  Part,
  InsertPart,
  ComponentPart,
  AttributePart,
  EventPart,
} from "./ir.ts";

const VOID_ELEMENTS = new Set<string>(htmlVoidElements);

const isComponentName = (n: string) => /^[A-Z]/.test(n);
const isEventName = (n: string) => /^on[A-Z]/.test(n);
const eventType = (n: string) => n.slice(2).toLowerCase();

function normalizeAttrName(name: string): string {
  if (name === "className") return "class";
  if (name === "htmlFor") return "for";
  return name;
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function normalizeText(raw: string): string {
  if (!raw.includes("\n")) return raw;
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  return lines.join(" ");
}

export const elementName = (node: JSXElement): string =>
  (node.openingElement.name as any).name as string;

const attrName = (attr: JSXAttribute): string =>
  (attr.name as any).name as string;

const isExprValue = (
  value: JSXAttribute["value"],
): value is JSXExpressionContainer & { expression: t.Expression } =>
  value != null &&
  value.type === "JSXExpressionContainer" &&
  t.isExpression(value.expression);

export const isComponentElement = (node: JSXElement): boolean => {
  const name = node.openingElement.name;
  return name.type === "JSXIdentifier" && isComponentName(name.name);
};

export class TemplateLowerer {
  lower(root: JSXElement): Template {
    const parts: Part[] = [];
    const html = this.element(root, [], parts);
    return new Template(html, parts);
  }

  private element(node: JSXElement, path: number[], parts: Part[]): string {
    const tag = elementName(node);
    const attrs = this.attributes(node, path, parts);
    const children = this.children(node, path, parts);
    return VOID_ELEMENTS.has(tag)
      ? `<${tag}${attrs}>`
      : `<${tag}${attrs}>${children}</${tag}>`;
  }

  private attributes(node: JSXElement, path: number[], parts: Part[]): string {
    let html = "";
    for (const attr of node.openingElement.attributes) {
      if (attr.type !== "JSXAttribute") continue;
      const name = attrName(attr);
      const value = attr.value;

      if (isEventName(name)) {
        const handler = isExprValue(value)
          ? value.expression
          : t.identifier("undefined");
        parts.push(new EventPart(path, eventType(name), handler));
        continue;
      }
      if (isExprValue(value)) {
        parts.push(new AttributePart(path, normalizeAttrName(name), value.expression));
        continue;
      }
      if (value == null) {
        html += ` ${normalizeAttrName(name)}`;
        continue;
      }
      if (value.type === "StringLiteral") {
        html += ` ${normalizeAttrName(name)}="${escapeAttr(value.value)}"`;
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
    const props = node.openingElement.attributes
      .map((attr) => this.prop(attr))
      .filter((p): p is t.ObjectProperty | t.ObjectMethod => p !== null);
    return t.objectExpression(props);
  }

  private prop(
    attr: JSXAttribute | JSXSpreadAttribute,
  ): t.ObjectProperty | t.ObjectMethod | null {
    if (attr.type !== "JSXAttribute") return null;
    const key = t.stringLiteral(attrName(attr));
    const value = attr.value;
    if (value == null) return t.objectProperty(key, t.booleanLiteral(true));
    if (isExprValue(value))
      return t.objectMethod(
        "get",
        key,
        [],
        t.blockStatement([t.returnStatement(value.expression)]),
      );
    if (value.type === "StringLiteral")
      return t.objectProperty(key, t.stringLiteral(value.value));
    return null;
  }
}
