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

  it("inserts a child component via createComponent", () => {
    const out = compileOk(
      `export default <div><Hello name="x" /></div>;`,
    );
    expect(norm(out)).toContain('_$createComponent(Hello, { "name": "x" })');
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

describe("conditional rendering", () => {
  it("lowers component branches of a conditional inside an expression", () => {
    const out = compileOk(
      `export default <div>{cond() ? <Header /> : <Fallback />}</div>;`,
    );
    expect(norm(out)).toContain(
      "() => cond() ? _$createComponent(Header, {}) : _$createComponent(Fallback, {})",
    );
    expect(out).not.toContain("<Header");
    expect(out).not.toContain("<Fallback");
  });

  it("lowers DOM-element branches of a conditional to templates", () => {
    const out = compileOk(
      `export default <div>{cond() ? <a href="x" /> : <b />}</div>;`,
    );
    expect(out).toContain('_$template("<a href=\\"x\\"></a>")');
    expect(out).toContain('_$template("<b></b>")');
    expect(norm(out)).toContain("() => cond() ?");
  });

  it("lowers nested conditionals", () => {
    const out = compileOk(
      `export default <div>{a() ? (b() ? <X /> : <Y />) : <Z />}</div>;`,
    );
    const n = norm(out);
    expect(n).toContain("_$createComponent(X, {})");
    expect(n).toContain("_$createComponent(Y, {})");
    expect(n).toContain("_$createComponent(Z, {})");
  });

  it("lowers JSX that appears in a component prop value", () => {
    const out = compileOk(
      `export default <div><Card icon={<Icon />} /></div>;`,
    );
    expect(norm(out)).toContain(
      'get "icon"() { return _$createComponent(Icon, {}); }',
    );
    expect(out).not.toContain("<Icon");
  });
});

describe("component as value", () => {
  it("compiles a root component despite emitting no templates", () => {
    const out = compileOk(`export default <C />;`);
    const n = norm(out);
    expect(n).toContain("export default function (props) {");
    expect(n).toContain("return _$createComponent(C, {});");
    expect(out).toContain('from "@turbo/runtime"');
    expect(out).not.toContain("_$template");
    expect(out).not.toContain("<C");
  });

  it("passes props to a root component", () => {
    const out = compileOk(`export default <C x={y()} t="hi" />;`);
    const n = norm(out);
    expect(n).toContain('get "x"() { return y(); }');
    expect(n).toContain('"t": "hi"');
  });

  it("compiles a memo whose body returns conditional JSX (case 2)", () => {
    const out = compileOk(
      `const C = memo(() => cond() ? <A /> : <B />);
       export default <div><C /></div>;`,
    );
    const n = norm(out);
    expect(n).toContain(
      "memo(() => cond() ? _$createComponent(A, {}) : _$createComponent(B, {}))",
    );
    expect(n).toContain("_$insert(_n$0, _$createComponent(C, {}))");
  });

  it("compiles a JSX node value used as a component (case 3)", () => {
    const out = compileOk(
      `const C = <div>123</div>;
       export default <section><C /></section>;`,
    );
    const n = norm(out);
    expect(n).toContain("const C = (() =>");
    expect(n).toContain("_$createComponent(C, {})");
  });

  it("compiles a signal of JSX used as a component (case 4)", () => {
    const out = compileOk(
      `const C = signal<JSX.Element>(<div />);
       export default <p><C /></p>;`,
    );
    const n = norm(out);
    expect(n).toContain("signal<JSX.Element>((() =>");
    expect(n).toContain("_$createComponent(C, {})");
  });

  it("throws on a fragment used as a conditional branch", () => {
    expect(() =>
      compile(`export default <div>{cond() ? <>x</> : null}</div>;`),
    ).toThrow(/fragments/);
  });
});
