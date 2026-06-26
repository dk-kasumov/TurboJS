import { generate as generateCode } from "../../utils/babel.utils.ts";
import type { Unit, CompileResult } from "../../pipeline.ts";

export function generate(unit: Unit): CompileResult {
  const out = generateCode(unit.ast, unit.filename, unit.source);
  return { code: out.code, map: out.map };
}
