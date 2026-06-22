import type { NodePath } from "@babel/traverse";
import type { JSXElement, JSXFragment } from "@babel/types";
import { Parser } from "./parser.ts";
import {
  TemplateLowerer,
  isComponentElement,
  elementName,
} from "./lowering.ts";
import { FactoryTransform } from "./transforms.ts";
import { RuntimeRegistry, TemplateEmitter, ModuleEmitter } from "./codegen.ts";
import { createComponentCall } from "./ir.ts";

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
    let didCompile = false;

    const isRenderRoot = (path: NodePath): boolean => {
      const parent = path.parentPath;
      return !(parent != null && (parent.isJSXElement() || parent.isJSXFragment()));
    };

    this.parser.traverse(ast, {
      JSXElement: {
        exit: (path: NodePath<JSXElement>) => {
          if (!isRenderRoot(path)) return;
          didCompile = true;

          if (isComponentElement(path.node)) {
            path.replaceWith(
              createComponentCall(
                elementName(path.node),
                this.lowerer.componentProps(path.node),
                runtime,
              ),
            );
            return;
          }

          const template = this.lowerer.lower(path.node);
          const iife = this.emitter.emit(template, templates.length, runtime);
          templates.push(template.html);
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

    if (!didCompile) {
      const out = this.parser.generate(ast, filename, code);
      return { code: out.code, map: out.map };
    }

    this.factory.apply(ast);
    ast.program.body.unshift(...this.module.headerStatements(runtime, templates));

    const out = this.parser.generate(ast, filename, code);
    return { code: out.code, map: out.map };
  }
}
