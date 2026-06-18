import { describe, it, expect } from "vitest";
import { parse } from "@babel/parser";
import { compile } from "./index";

/** Compile and assert the output is syntactically valid JS (no leftover JSX). */
function compileOk(src: string): string {
  const { code } = compile(src);
  expect(() =>
    parse(code, { sourceType: "module", plugins: ["typescript"] }),
  ).not.toThrow();
  return code;
}

/** Collapse whitespace so assertions don't depend on Babel's pretty-printing. */
const norm = (s: string) => s.replace(/\s+/g, " ");

describe("compile", () => {
  it("hoists a template and returns a cloned node", () => {
    const out = compileOk(`export default <div class="a">hi</div>;`);
    expect(out).toContain('_$template("<div class=\\"a\\">hi</div>")');
    expect(out).toContain("_tmpl$0()");
    expect(out).toContain("return _el$");
    expect(out).toContain('from "@turbo/runtime"');
  });

  it("maps className -> class", () => {
    const out = compileOk(`export default <div className="x" />;`);
    expect(out).toContain('class=\\"x\\"');
  });

  it("wraps dynamic expressions in a thunk insert", () => {
    const out = compileOk(
      `const count = signal(0); export default <p>{count()}</p>;`,
    );
    expect(out).toContain('_$template("<p><!></p>")');
    expect(out).toContain("_$insert(");
    expect(norm(out)).toContain("() => count()");
  });

  it("compiles onX handlers to event listeners", () => {
    const out = compileOk(
      `export default <button onClick={() => go()}>x</button>;`,
    );
    expect(out).toContain('_$on(_el$, "click", () => go())');
  });

  it("compiles dynamic attributes to an effect", () => {
    const out = compileOk(`export default <input value={v()} />;`);
    expect(out).toContain('_$effect(() => _$setAttr(_el$, "value", v()))');
  });

  it("compiles a component to a call inserted statically", () => {
    const out = compileOk(
      `export default <div><Hello name="x" /></div>;`,
    );
    expect(norm(out)).toContain('Hello({ "name": "x" })');
    expect(out).toContain("_$insert(");
  });

  it("navigates nested markers by index path", () => {
    const out = compileOk(
      `export default <div><h1>Count: {c()}</h1><button onClick={inc}>+</button></div>;`,
    );
    expect(norm(out)).toContain("_$nodeAt(_el$, [0, 1])"); // marker inside <h1>
    expect(norm(out)).toContain("_$nodeAt(_el$, [1])"); // the button
  });

  it("passes through files without JSX untouched-ish", () => {
    const out = compile(`export const x = 1;`);
    expect(out.code).not.toContain("@turbo/runtime");
    expect(out.code).toContain("export const x = 1");
  });
});

describe("component model (factory wrap)", () => {
  it("wraps a wrapper-free module into a per-instance (props) factory", () => {
    const out = compileOk(
      `import { signal } from "@turbo/reactivity";
       const count = signal(0);
       export default <p>{count()}</p>;`,
    );
    const n = norm(out);
    // setup moves *inside* the factory; import stays at module scope.
    expect(n).toContain("export default function (props) {");
    expect(n).toMatch(/function \(props\) \{ const count = signal\(0\)/);
    expect(n).toContain("return (() =>");
    expect(out).toContain('import { signal } from "@turbo/reactivity"');
  });

  it("emits dynamic props as reactive getters", () => {
    const out = compileOk(`export default <div><H n={x()} t="hi" /></div>;`);
    const n = norm(out);
    expect(n).toContain('get "n"() { return x(); }');
    expect(n).toContain('"t": "hi"');
  });

  it("leaves an explicit function default export alone", () => {
    const out = compileOk(`export default (props) => <p>{props.x}</p>;`);
    expect(out).toContain("props => ");
    expect(out).not.toContain("function (props)");
  });
});
