import type * as t from "@babel/types";
import type { RuntimeHelper } from "./utils/runtime.utils.ts";

export interface CompileOptions {
  resolveStyle?: (path: string) => string;
}

export interface ScopeState {
  attr: string | null;
  css: string;
}

export interface Unit {
  source: string;
  filename: string;
  ast: t.File;
  templates: string[];
  helpers: Set<RuntimeHelper>;
  compiled: boolean;
  scope?: ScopeState;
}

export type Stage = (unit: Unit) => Unit;

export interface CompileResult {
  code: string;
  map?: any;
}
