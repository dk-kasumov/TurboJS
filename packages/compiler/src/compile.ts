import { parse } from "./stages/01-parse/parse.ts";
import { lower } from "./stages/02-lower/lower.ts";
import { factory } from "./stages/03-factory/factory.ts";
import { header } from "./stages/04-header/header.ts";
import { generate } from "./stages/05-generate/generate.ts";
import type { CompileResult } from "./pipeline.ts";

export type { CompileResult };

export function compile(code: string, filename = "input.tsx"): CompileResult {
  const parsed = parse(code, filename);
  const lowered = lower(parsed);
  const wrapped = factory(lowered);
  const headed = header(wrapped);
  return generate(headed);
}
