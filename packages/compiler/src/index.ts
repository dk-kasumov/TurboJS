export { compile, type CompileResult } from "./compile.ts";

export {
  findDefaultExport,
  isFactoryDeclaration,
  partitionModuleBody,
  collectIO,
  type ModulePartition,
  type IOBinding,
  type IOKind,
} from "./module-shape.ts";
