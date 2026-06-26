import { parse } from "@babel/parser";
import * as t from "@babel/types";
import type { CodeMapping } from "@volar/language-core";
import {
  collectIO,
  findDefaultExport,
  isFactoryDeclaration,
  partitionModuleBody,
  type IOBinding,
  type IOKind,
} from "@turbo/compiler";

export interface TransformResult {
  code: string;
  mappings: CodeMapping[];
}

const FACTORY = "__turbo_default";
const PROPS_TYPE = "__TurboProps";
const PROPS_PARAM = "_$props";

const FULL_FEATURES: CodeMapping["data"] = {
  verification: true,
  completion: true,
  semantic: true,
  navigation: true,
  structure: true,
};

const MEMBER_SUFFIX: Record<IOKind, (name: string) => string> = {
  inputRequired: (name) => `: TurboInputValue<typeof ${name}>`,
  output: (name) => `?: (value: TurboOutputValue<typeof ${name}>) => void`,
  input: (name) => `?: TurboInputValue<typeof ${name}>`,
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

  statements(source: string, statements: t.Statement[]): void {
    for (const stmt of statements) {
      this.copy(source, stmt.start!, stmt.end!);
      this.text("\n");
    }
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

function emitPropsType(
  builder: VirtualBuilder,
  source: string,
  io: IOBinding[],
): void {
  builder.text(`type ${PROPS_TYPE} = {\n`);
  for (const binding of io) {
    const id = binding.declarator.id as t.Identifier;
    builder.text("  ");
    builder.copy(source, id.start!, id.end!);
    builder.text(`${MEMBER_SUFFIX[binding.kind](binding.name)};\n`);
  }
  builder.text("};\n");
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
  const io = collectIO(setup);
  const usesIO = io.length > 0;
  const returnAnnotation =
    t.isJSXElement(decl) || t.isJSXFragment(decl) ? ": JSX.Element" : "";
  const params = usesIO
    ? `${PROPS_PARAM}: ${PROPS_TYPE}`
    : `props: ${findPropsType(keep)}`;

  const builder = new VirtualBuilder();
  builder.statements(source, keep);
  if (usesIO) {
    builder.statements(source, setup);
    emitPropsType(builder, source, io);
  }

  builder.text(`const ${FACTORY} = (${params})${returnAnnotation} => {\n`);
  if (!usesIO) builder.statements(source, setup);
  builder.text("return (\n");
  builder.copy(source, decl.start!, decl.end!);
  builder.text(`\n);\n};\nexport default ${FACTORY};\n`);

  return builder.result();
}
