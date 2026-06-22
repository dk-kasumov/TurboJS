import { describe, it, expect } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import ts from "typescript";
import { check } from "./index";

function fixture(rel: string): string {
  return path.resolve("packages/language-tools/test/fixtures", rel);
}

function authoredSlice(diagnostic: ts.Diagnostic): string {
  const text = fs.readFileSync(diagnostic.file!.fileName, "utf8");
  return text.slice(diagnostic.start!, diagnostic.start! + diagnostic.length!);
}

describe("check (turbo-check)", () => {
  it("passes a correct magic-props component and its call site", () => {
    const result = check(fixture("pass/tsconfig.json"));
    expect(result.errorCount, result.format()).toBe(0);
  });

  it("passes the counter example end to end", () => {
    const result = check(path.resolve("examples/counter/tsconfig.json"));
    expect(result.errorCount, result.format()).toBe(0);
  });

  it("flags missing, wrong-type, and unknown props at the authored call site", () => {
    const result = check(fixture("fail/tsconfig.json"));
    const appErrors = result.diagnostics.filter((d) =>
      d.file?.fileName.endsWith("App.tsx"),
    );
    expect(appErrors.length).toBeGreaterThanOrEqual(3);

    const tokens = appErrors.map(authoredSlice);
    expect(tokens).toContain("Header");
    expect(tokens).toContain("title");
    expect(tokens).toContain("bogus");
  });

  it("maps an error inside a wrapped component back to the authored position", () => {
    const result = check(fixture("wrapped-error/tsconfig.json"));
    const err = result.diagnostics.find((d) =>
      d.file?.fileName.endsWith("Bad.tsx"),
    );
    expect(err, result.format()).toBeTruthy();
    expect(authoredSlice(err!)).toBe("titel");
  });
});
