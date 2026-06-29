import type { Encapsulation } from "@turbo/core";
import { rewriteCss } from "./rewrite.ts";

export interface Strategy {
  attribute(scopeId: string): string | null;
  transformCss(css: string, scopeId: string): string;
}

const emulated: Strategy = {
  attribute: (scopeId) => scopeId,
  transformCss: (css, scopeId) => rewriteCss(css, scopeId),
};

const none: Strategy = {
  attribute: () => null,
  transformCss: (css) => css,
};

const STRATEGIES: Record<string, Strategy> = { emulated, none };

export function strategyFor(encapsulation: unknown): Strategy {
  const key = String(encapsulation ?? "emulated").toLowerCase();
  return STRATEGIES[key] ?? emulated;
}
