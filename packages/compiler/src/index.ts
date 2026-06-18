import { Compiler, type CompileResult } from "./compiler.ts";

export type { CompileResult };
export { Compiler };

export function compile(code: string, filename = "input.tsx"): CompileResult {
  return new Compiler().compile(code, filename);
}
