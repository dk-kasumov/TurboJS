import * as t from "@babel/types";
import type { RuntimeUse } from "../../utils/runtime.utils.ts";

export interface EmitContext {
  ref: t.Expression;
  runtime: RuntimeUse;
}

export abstract class Part {
  readonly path: number[];

  constructor(path: number[]) {
    this.path = path;
  }

  abstract emit(ctx: EmitContext): t.Statement;
}

export class InsertPart extends Part {
  readonly expr: t.Expression;
  readonly dynamic: boolean;

  constructor(path: number[], expr: t.Expression, dynamic: boolean) {
    super(path);
    this.expr = expr;
    this.dynamic = dynamic;
  }

  emit({ ref, runtime }: EmitContext): t.Statement {
    const value = this.dynamic
      ? t.arrowFunctionExpression([], this.expr)
      : this.expr;
    return t.expressionStatement(
      t.callExpression(runtime.use("insert"), [ref, value]),
    );
  }
}

export function createComponentCall(
  name: string,
  props: t.Expression,
  runtime: RuntimeUse,
): t.CallExpression {
  return t.callExpression(runtime.use("createComponent"), [
    t.identifier(name),
    props,
  ]);
}

export class ComponentPart extends Part {
  readonly name: string;
  readonly props: t.Expression;

  constructor(path: number[], name: string, props: t.Expression) {
    super(path);
    this.name = name;
    this.props = props;
  }

  emit({ ref, runtime }: EmitContext): t.Statement {
    return t.expressionStatement(
      t.callExpression(runtime.use("insert"), [
        ref,
        createComponentCall(this.name, this.props, runtime),
      ]),
    );
  }
}

export class AttributePart extends Part {
  readonly name: string;
  readonly expr: t.Expression;

  constructor(path: number[], name: string, expr: t.Expression) {
    super(path);
    this.name = name;
    this.expr = expr;
  }

  emit({ ref, runtime }: EmitContext): t.Statement {
    const set = t.callExpression(runtime.use("setAttr"), [
      ref,
      t.stringLiteral(this.name),
      this.expr,
    ]);
    return t.expressionStatement(
      t.callExpression(runtime.use("effect"), [t.arrowFunctionExpression([], set)]),
    );
  }
}

export class EventPart extends Part {
  readonly type: string;
  readonly handler: t.Expression;

  constructor(path: number[], type: string, handler: t.Expression) {
    super(path);
    this.type = type;
    this.handler = handler;
  }

  emit({ ref, runtime }: EmitContext): t.Statement {
    return t.expressionStatement(
      t.callExpression(runtime.use("on"), [
        ref,
        t.stringLiteral(this.type),
        this.handler,
      ]),
    );
  }
}

export class Template {
  readonly html: string;
  readonly parts: Part[];

  constructor(html: string, parts: Part[]) {
    this.html = html;
    this.parts = parts;
  }
}
