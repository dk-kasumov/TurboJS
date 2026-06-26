import { parse as babelParse } from "@babel/parser";
import _traverse, { type TraverseOptions } from "@babel/traverse";
import _generate from "@babel/generator";
import type * as t from "@babel/types";

const traverseFn = ((_traverse as any).default ?? _traverse) as typeof _traverse;
const generateFn = ((_generate as any).default ?? _generate) as typeof _generate;

export interface Generated {
  code: string;
  map?: any;
}

export function parse(code: string): t.File {
  return babelParse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });
}

export function traverse(ast: t.Node, visitors: TraverseOptions): void {
  traverseFn(ast, visitors);
}

export function generate(ast: t.Node, filename: string, original: string): Generated {
  const out = generateFn(
    ast,
    { sourceMaps: true, sourceFileName: filename },
    original,
  );
  return { code: out.code, map: out.map };
}
