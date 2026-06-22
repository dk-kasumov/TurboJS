import { parse } from "@babel/parser";
import * as t from "@babel/types";
import type { CodeMapping } from "@volar/language-core";
import {
  findDefaultExport,
  isFactoryDeclaration,
  partitionModuleBody,
} from "@turbo/compiler";

export interface TransformResult {
  code: string;
  mappings: CodeMapping[];
}

const FULL_FEATURES: CodeMapping["data"] = {
  verification: true,
  completion: true,
  semantic: true,
  navigation: true,
  structure: true,
};

class VirtualBuilder {
  code = "";
  private readonly sourceOffsets: number[] = [];
  private readonly generatedOffsets: number[] = [];
  private readonly lengths: number[] = [];

  text(value: string): void {
    this.code += value;
  }

  copy(source: string, start: number, end: number): void {
    if (end <= start) return;
    this.sourceOffsets.push(start);
    this.generatedOffsets.push(this.code.length);
    this.lengths.push(end - start);
    this.code += source.slice(start, end);
  }

  result(): TransformResult {
    const mappings: CodeMapping[] =
      this.sourceOffsets.length === 0
        ? []
        : [
            {
              sourceOffsets: this.sourceOffsets,
              generatedOffsets: this.generatedOffsets,
              lengths: this.lengths,
              data: FULL_FEATURES,
            },
          ];
    return { code: this.code, mappings };
  }
}

function identity(source: string): TransformResult {
  const builder = new VirtualBuilder();
  builder.copy(source, 0, source.length);
  return builder.result();
}

function findPropsType(keep: t.Statement[]): string {
  for (const stmt of keep) {
    if (t.isTSInterfaceDeclaration(stmt) && stmt.id.name === "Props")
      return "Props";
    if (t.isTSTypeAliasDeclaration(stmt) && stmt.id.name === "Props")
      return "Props";
  }
  return "TurboProps";
}

export function transform(source: string): TransformResult {
  let ast: t.File;
  try {
    ast = parse(source, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  } catch {
    return identity(source);
  }

  const def = findDefaultExport(ast);
  if (!def) return identity(source);

  const decl = def.declaration;
  if (isFactoryDeclaration(decl) || !t.isExpression(decl)) {
    return identity(source);
  }

  const { keep, setup } = partitionModuleBody(ast.program.body, def);
  const propsType = findPropsType(keep);
  const returnAnnotation =
    t.isJSXElement(decl) || t.isJSXFragment(decl) ? ": JSX.Element" : "";

  const builder = new VirtualBuilder();
  for (const stmt of keep) {
    builder.copy(source, stmt.start!, stmt.end!);
    builder.text("\n");
  }
  builder.text(
    `const __turbo_default = (props: ${propsType})${returnAnnotation} => {\n`,
  );
  for (const stmt of setup) {
    builder.copy(source, stmt.start!, stmt.end!);
    builder.text("\n");
  }
  builder.text("return (\n");
  builder.copy(source, decl.start!, decl.end!);
  builder.text("\n);\n};\nexport default __turbo_default;\n");

  return builder.result();
}
