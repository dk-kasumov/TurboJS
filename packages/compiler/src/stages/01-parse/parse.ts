import { parse as parseCode } from "../../utils/babel.utils.ts";
import type { Unit } from "../../pipeline.ts";

export function parse(source: string, filename: string): Unit {
  return {
    source,
    filename,
    ast: parseCode(source),
    templates: [],
    helpers: new Set(),
    compiled: false,
  };
}
