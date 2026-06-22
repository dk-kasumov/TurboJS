import { Compiler, type CompileResult } from "./compiler.ts";

export type { CompileResult };
export { Compiler };

export {
  findDefaultExport,
  isFactoryDeclaration,
  partitionModuleBody,
  collectIO,
  type ModulePartition,
  type IOBinding,
  type IOKind,
} from "./module-shape.ts";

export function compile(code: string, filename = "input.tsx"): CompileResult {
  return new Compiler().compile(code, filename);
}
