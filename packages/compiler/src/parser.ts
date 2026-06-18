import { parse } from "@babel/parser";
import _traverse, { type TraverseOptions } from "@babel/traverse";
import _generate from "@babel/generator";
import type * as t from "@babel/types";

const traverse = ((_traverse as any).default ?? _traverse) as typeof _traverse;
const generate = ((_generate as any).default ?? _generate) as typeof _generate;

export interface GeneratedCode {
  code: string;
  map?: any;
}

export class Parser {
  parse(code: string): t.File {
    return parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  }

  traverse(ast: t.Node, visitors: TraverseOptions): void {
    traverse(ast, visitors);
  }

  generate(ast: t.Node, filename: string, original: string): GeneratedCode {
    const out = generate(
      ast,
      { sourceMaps: true, sourceFileName: filename },
      original,
    );

    return { code: out.code, map: out.map };
  }
}
