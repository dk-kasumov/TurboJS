export { compile, type CompileResult, type CompileOptions } from "./compile.ts";

export {
  findDefaultExport,
  isFactoryDeclaration,
  partitionModuleBody,
  collectIO,
  type ModulePartition,
  type IOBinding,
  type IOKind,
} from "./module-shape.ts";
