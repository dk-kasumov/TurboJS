import { describe, it, expect } from "vitest";
import { parse } from "@babel/parser";
import { compile, type CompileOptions } from "./index";

const norm = (s: string) => s.replace(/\s+/g, " ");

function compileOk(src: string, options?: CompileOptions): string {
  const { code } = compile(src, "input.tsx", options);
  expect(() =>
    parse(code, { sourceType: "module", plugins: ["typescript"] }),
  ).not.toThrow();
  return code;
}

const styles = (css: string): CompileOptions => ({ resolveStyle: () => css });

describe("css encapsulation", () => {
  it("stamps a scope attribute and rewrites selectors in emulated mode", () => {
    const out = compileOk(
      `import { component, Encapsulation } from "@turbo/core";
       export const config = component({ encapsulation: Encapsulation.Emulated, styles: "./s.css" });
       export default <button class="btn">x</button>;`,
      styles(".btn { color: tomato; }"),
    );

    expect(norm(out)).toMatch(/class=\\"btn\\" t-\w+>x<\/button>/);
    expect(out).toMatch(/\.btn\[t-\w+\]/);
    expect(norm(out)).toContain("_$useStyle(_css$)");
    expect(out).not.toContain("config");
  });

  it("nests the scope attribute onto every native element", () => {
    const out = compileOk(
      `import { component } from "@turbo/core";
       export const config = component({ styles: "./s.css" });
       export default <div class="row"><span>x</span></div>;`,
      styles(".row { color: red; }"),
    );
    expect(norm(out)).toMatch(/<div class=\\"row\\" t-\w+><span t-\w+>x<\/span>/);
  });

  it("scopes the subject and ancestors of combinator selectors (Angular-style)", () => {
    const out = compileOk(
      `import { component } from "@turbo/core";
       export const config = component({ styles: "./s.css" });
       export default <div class="row"><b class="cell">x</b></div>;`,
      styles(".row > .cell { padding: 4px; } .cell:hover { color: red; }"),
    );
    expect(out).toMatch(/\.row\[t-\w+\] > \.cell\[t-\w+\]/);
    expect(out).toMatch(/\.cell\[t-\w+\]:hover/);
  });

  it("keeps CSS global and unstamped in none mode", () => {
    const out = compileOk(
      `import { component, Encapsulation } from "@turbo/core";
       export const config = component({ encapsulation: Encapsulation.None, styles: "./s.css" });
       export default <button class="btn">x</button>;`,
      styles(".btn { color: tomato; }"),
    );
    expect(out).not.toMatch(/t-\w+>x/);
    expect(out).toContain(".btn { color: tomato; }");
    expect(norm(out)).toContain("_$useStyle(_css$)");
  });

  it("concatenates multiple style files under one scope", () => {
    const map: Record<string, string> = {
      "./a.css": ".a { color: red; }",
      "./b.css": ".b { color: blue; }",
    };
    const out = compileOk(
      `import { component } from "@turbo/core";
       export const config = component({ styles: ["./a.css", "./b.css"] });
       export default <div class="a"><i class="b" /></div>;`,
      { resolveStyle: (p) => map[p] },
    );
    expect(out).toMatch(/\.a\[t-\w+\]/);
    expect(out).toMatch(/\.b\[t-\w+\]/);
  });

  it("leaves modules without a config export untouched", () => {
    const out = compileOk(`export default <button class="btn">x</button>;`);
    expect(out).not.toContain("_$useStyle");
    expect(out).not.toContain("_css$");
  });

  it("throws when styles are declared but no resolver is given", () => {
    expect(() =>
      compile(
        `import { component } from "@turbo/core";
         export const config = component({ styles: "./s.css" });
         export default <div />;`,
      ),
    ).toThrow(/resolveStyle/);
  });
});
