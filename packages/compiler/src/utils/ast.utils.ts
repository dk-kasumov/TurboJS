import { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import { JSXAttribute, JSXElement, JSXExpressionContainer, JSXSpreadAttribute } from "@babel/types";
import { htmlVoidElements } from "html-void-elements";

export const isComponentName = (n: string) => /^[A-Z]/.test(n);

export const isEventName = (n: string) => /^on[A-Z]/.test(n);

export const eventType = (n: string) => n.slice(2).toLowerCase();

export const VOID_ELEMENTS = new Set<string>(htmlVoidElements);

export const isRenderRoot = (path: NodePath) => {
    const parent = path.parentPath;
    const hasParent = parent?.isJSXElement() || parent?.isJSXFragment();
    return !hasParent;
};

export const escapeText = (s: string) => {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const escapeAttr = (s: string) => {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
};

export const normalizeText = (raw: string) => {
    if (!raw.includes("\n")) return raw;

    const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length);
    return lines.join(" ");
}

export const elementName = (node: JSXElement) => {
    const element = node.openingElement.name as Record<'name', string>;
    return element.name;
}

export const attrName = (attr: JSXAttribute) => {
    const element = attr.name as Record<'name', string>;
    return element.name;
}

export const isExprValue = (value: JSXAttribute["value"]): value is JSXExpressionContainer & { expression: t.Expression } => {
    const result = value && value.type === "JSXExpressionContainer" && t.isExpression(value.expression)
    return !!result;
};

export const isComponentElement = (node: JSXElement) => {
    const name = node.openingElement.name;
    return name.type === "JSXIdentifier" && isComponentName(name.name);
};

export type AttrValue =
    | { kind: "boolean" }
    | { kind: "static"; value: string }
    | { kind: "dynamic"; expr: t.Expression }
    | { kind: "ignore" };

export const readAttr = (
    attr: JSXAttribute | JSXSpreadAttribute,
): { name: string; value: AttrValue } | null => {
    if (attr.type !== "JSXAttribute") return null;

    const name = attrName(attr);
    const value = attr.value;

    if (value == null) return { name, value: { kind: "boolean" } };
    if (isExprValue(value)) return { name, value: { kind: "dynamic", expr: value.expression } };
    if (value.type === "StringLiteral") return { name, value: { kind: "static", value: value.value } };

    return { name, value: { kind: "ignore" } };
};