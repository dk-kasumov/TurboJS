import { describe, it, expect } from "vitest";
import { parse } from "@babel/parser";
import { compile } from "./index";

const norm = (s: string) => s.replace(/\s+/g, " ");

function compileOk(src: string): string {
  const { code } = compile(src);
  expect(() =>
    parse(code, { sourceType: "module", plugins: ["typescript"] }),
  ).not.toThrow();
  return code;
}

describe("element lowering", () => {
  it("hoists a template, clones it, and imports from the runtime", () => {
    const out = compileOk(`export default <div class="a">hi</div>;`);
    expect(out).toContain('_$template("<div class=\\"a\\">hi</div>")');
    expect(out).toContain("_tmpl$0()");
    expect(out).toContain("return _el$");
    expect(out).toContain('from "@turbo/runtime"');
  });

  it("inserts dynamic children through a thunk", () => {
    const out = compileOk(`const c = signal(0); export default <p>{c()}</p>;`);
    expect(out).toContain('_$template("<p><!></p>")');
    expect(norm(out)).toContain("_$insert(");
    expect(norm(out)).toContain("() => c()");
  });

  it("binds dynamic attributes inside an effect", () => {
    expect(compileOk(`export default <input value={v()} />;`)).toContain(
      '_$effect(() => _$setAttr(_el$, "value", v()))',
    );
  });

  it("compiles onX handlers to event listeners", () => {
    expect(
      compileOk(`export default <button onClick={() => go()}>x</button>;`),
    ).toContain('_$on(_el$, "click", () => go())');
  });

  it("addresses nested markers by index path", () => {
    const out = norm(
      compileOk(
        `export default <div><h1>Count: {c()}</h1><button onClick={inc}>+</button></div>;`,
      ),
    );
    expect(out).toContain("_$nodeAt(_el$, [0, 1])");
    expect(out).toContain("_$nodeAt(_el$, [1])");
  });

  it("leaves JSX-free modules untouched", () => {
    const { code } = compile(`export const x = 1;`);
    expect(code).not.toContain("@turbo/runtime");
    expect(code).toContain("export const x = 1");
  });
});

describe("component model", () => {
  it("wraps a wrapper-free module into a per-instance (props) factory", () => {
    const out = compileOk(
      `import { signal } from "@turbo/reactivity";
       const count = signal(0);
       export default <p>{count()}</p>;`,
    );
    expect(norm(out)).toContain("export default function (props) {");
    expect(norm(out)).toMatch(/function \(props\) \{ const count = signal\(0\)/);
    expect(out).toContain('import { signal } from "@turbo/reactivity"');
  });

  it("keeps module-scope setup imports while moving calls into the factory", () => {
    const out = compileOk(
      `import { onDestroy } from "@turbo/core";\nonDestroy(() => stop());\nexport default <div />;`,
    );
    expect(out).toContain('import { onDestroy } from "@turbo/core"');
    expect(norm(out)).toContain("function (props) { onDestroy(() => stop());");
  });

  it("leaves an explicit function default export alone", () => {
    const out = compileOk(`export default (props) => <p>{props.x}</p>;`);
    expect(out).toContain("props => ");
    expect(out).not.toContain("function (props)");
  });
});

describe("child components", () => {
  it("creates a child component and passes static props", () => {
    const out = compileOk(`export default <div><Hello name="x" /></div>;`);
    expect(norm(out)).toContain('_$createComponent(Hello, { "name": "x" })');
    expect(norm(out)).toContain("_$insert(");
  });

  it("emits dynamic props as reactive getters", () => {
    const out = norm(compileOk(`export default <div><H n={x()} t="hi" /></div>;`));
    expect(out).toContain('get "n"() { return x(); }');
    expect(out).toContain('"t": "hi"');
  });

  it("compiles a root component that emits no templates", () => {
    const out = norm(compileOk(`export default <C x={y()} t="hi" />;`));
    expect(out).toContain("export default function (props) {");
    expect(out).toContain("_$createComponent(C, {");
    expect(out).toContain('get "x"() { return y(); }');
    expect(out).toContain('"t": "hi"');
    expect(out).not.toContain("_$template");
  });
});

describe("conditional rendering", () => {
  it("lowers component branches of a conditional expression", () => {
    const out = compileOk(
      `export default <div>{cond() ? <Header /> : <Fallback />}</div>;`,
    );
    expect(norm(out)).toContain(
      "() => cond() ? _$createComponent(Header, {}) : _$createComponent(Fallback, {})",
    );
    expect(out).not.toContain("<Header");
    expect(out).not.toContain("<Fallback");
  });

  it("lowers DOM-element branches to templates", () => {
    const out = compileOk(
      `export default <div>{cond() ? <a href="x" /> : <b />}</div>;`,
    );
    expect(out).toContain('_$template("<a href=\\"x\\"></a>")');
    expect(out).toContain('_$template("<b></b>")');
    expect(norm(out)).toContain("() => cond() ?");
  });

  it("lowers nested conditionals", () => {
    const out = norm(
      compileOk(`export default <div>{a() ? (b() ? <X /> : <Y />) : <Z />}</div>;`),
    );
    expect(out).toContain("_$createComponent(X, {})");
    expect(out).toContain("_$createComponent(Y, {})");
    expect(out).toContain("_$createComponent(Z, {})");
  });

  it("lowers JSX passed as a component prop value", () => {
    const out = compileOk(`export default <div><Card icon={<Icon />} /></div>;`);
    expect(norm(out)).toContain(
      'get "icon"() { return _$createComponent(Icon, {}); }',
    );
    expect(out).not.toContain("<Icon");
  });

  it("throws on a fragment used as a conditional branch", () => {
    expect(() =>
      compile(`export default <div>{cond() ? <>x</> : null}</div>;`),
    ).toThrow(/fragments/);
  });
});

describe("component-as-value forms", () => {
  it("lowers a memo whose body returns conditional JSX", () => {
    const out = norm(
      compileOk(
        `const C = memo(() => cond() ? <A /> : <B />);
         export default <div><C /></div>;`,
      ),
    );
    expect(out).toContain(
      "memo(() => cond() ? _$createComponent(A, {}) : _$createComponent(B, {}))",
    );
    expect(out).toContain("_$insert(_n$0, _$createComponent(C, {}))");
  });

  it("lowers a JSX node bound to a const and used as a component", () => {
    const out = norm(
      compileOk(
        `const C = <div>123</div>;
         export default <section><C /></section>;`,
      ),
    );
    expect(out).toContain("const C = (() =>");
    expect(out).toContain("_$createComponent(C, {})");
  });

  it("lowers a signal of JSX used as a component", () => {
    const out = norm(
      compileOk(
        `const C = signal<JSX.Element>(<div />);
         export default <p><C /></p>;`,
      ),
    );
    expect(out).toContain("signal<JSX.Element>((() =>");
    expect(out).toContain("_$createComponent(C, {})");
  });
});

describe("input/output bindings", () => {
  it("binds input() to a named prop with its default", () => {
    const out = compileOk(
      `import { input } from "@turbo/core";
       const title = input("hi");
       export default <p>{title()}</p>;`,
    );
    expect(norm(out)).toContain("export default function (_$props) {");
    expect(norm(out)).toContain('const title = _$input(_$props, "title", "hi")');
    expect(out).toContain('import { _$input } from "@turbo/core"');
  });

  it("binds input.required() without a default", () => {
    const out = compileOk(
      `import { input } from "@turbo/core";
       const count = input.required<number>();
       export default <p>{count()}</p>;`,
    );
    expect(norm(out)).toContain('const count = _$inputRequired(_$props, "count")');
    expect(out).toContain('import { _$inputRequired } from "@turbo/core"');
  });

  it("binds output() to a named prop and keeps emit() calls", () => {
    const out = norm(
      compileOk(
        `import { output } from "@turbo/core";
         const submit = output<string>();
         export default <button onClick={() => submit.emit("x")}>go</button>;`,
      ),
    );
    expect(out).toContain('const submit = _$output(_$props, "submit")');
    expect(out).toContain('submit.emit("x")');
  });

  it("keeps the plain props factory when no input/output is used", () => {
    const out = compileOk(`export default <p>{count()}</p>;`);
    expect(norm(out)).toContain("export default function (props) {");
    expect(out).not.toContain("@turbo/core");
  });
});
