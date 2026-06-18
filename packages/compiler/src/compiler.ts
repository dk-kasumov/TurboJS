import type { NodePath } from "@babel/traverse";
import type { JSXElement, JSXFragment } from "@babel/types";
import { Parser } from "./parser.ts";
import { TemplateLowerer } from "./lowering.ts";
import { FactoryTransform } from "./transforms.ts";
import { RuntimeRegistry, TemplateEmitter, ModuleEmitter } from "./codegen.ts";

export interface CompileResult {
  code: string;
  map?: any;
}

export class Compiler {
  private readonly parser = new Parser();
  private readonly lowerer = new TemplateLowerer();
  private readonly emitter = new TemplateEmitter();
  private readonly factory = new FactoryTransform();
  private readonly module = new ModuleEmitter();

  compile(code: string, filename = "input.tsx"): CompileResult {
    const ast = this.parser.parse(code);
    const runtime = new RuntimeRegistry();
    const templates: string[] = [];

    const isRoot = (path: NodePath) =>
      !path.findParent((p) => p.isJSXElement() || p.isJSXFragment());

    this.parser.traverse(ast, {
      JSXElement: (path: NodePath<JSXElement>) => {
        if (!isRoot(path)) return;
        const template = this.lowerer.lower(path.node);
        const iife = this.emitter.emit(template, templates.length, runtime);
        templates.push(template.html);
        path.replaceWith(iife);
        path.skip();
      },
      JSXFragment: (path: NodePath<JSXFragment>) => {
        if (!isRoot(path)) return;
        throw new Error("turbo: JSX fragments are not supported yet");
      },
    });

    if (templates.length === 0) {
      const out = this.parser.generate(ast, filename, code);
      return { code: out.code, map: out.map };
    }

    this.factory.apply(ast);
    ast.program.body.unshift(...this.module.headerStatements(runtime, templates));

    const out = this.parser.generate(ast, filename, code);
    return { code: out.code, map: out.map };
  }
}
