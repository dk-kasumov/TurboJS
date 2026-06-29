import { parse } from "./stages/01-parse/parse.ts";
import { lower } from "./stages/02-lower/lower.ts";
import { factory } from "./stages/03-factory/factory.ts";
import { header } from "./stages/04-header/header.ts";
import { generate } from "./stages/05-generate/generate.ts";
import { scope } from "./scope.ts";
import type { CompileResult, CompileOptions } from "./pipeline.ts";

export type { CompileResult, CompileOptions };

export function compile(
  code: string,
  filename = "input.tsx",
  options: CompileOptions = {},
): CompileResult {
  const parsed = parse(code, filename);
  const scoped = scope(parsed, options);
  const lowered = lower(scoped);
  const wrapped = factory(lowered);
  const headed = header(wrapped);
  return generate(headed);
}
