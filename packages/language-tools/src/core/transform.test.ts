import { describe, it, expect } from "vitest";
import type { CodeMapping } from "@volar/language-core";
import { transform } from "./transform";

function generatedOffsetOf(
  mappings: CodeMapping[],
  sourceOffset: number,
): number {
  for (const map of mappings) {
    for (let i = 0; i < map.sourceOffsets.length; i++) {
      const start = map.sourceOffsets[i];
      if (sourceOffset >= start && sourceOffset < start + map.lengths[i]) {
        return map.generatedOffsets[i] + (sourceOffset - start);
      }
    }
  }
  return -1;
}

function expectRoundTrip(source: string, needle: string): void {
  const { code, mappings } = transform(source);
  const sourceOffset = source.indexOf(needle);
  expect(sourceOffset, `"${needle}" missing from source`).toBeGreaterThanOrEqual(
    0,
  );
  const generatedOffset = generatedOffsetOf(mappings, sourceOffset);
  expect(generatedOffset).toBeGreaterThanOrEqual(0);
  expect(code.slice(generatedOffset, generatedOffset + needle.length)).toBe(
    needle,
  );
}

const orderOf = (code: string, ...parts: string[]) =>
  parts.map((part) => code.indexOf(part));

const MAGIC_PROPS = `interface Props {
  title: string;
}

export default (
  <header><h1>{props.title}</h1></header>
);`;

describe("transform", () => {
  it("wraps a magic-props component using its declared interface Props", () => {
    const { code } = transform(MAGIC_PROPS);
    expect(code).toContain("interface Props {");
    expect(code).toContain(
      "const __turbo_default = (props: Props): JSX.Element => {",
    );
    expect(code).toContain("return (");
    expect(code).toContain("{props.title}");
    expect(code).toContain("export default __turbo_default;");

    const [iface, factory] = orderOf(
      code,
      "interface Props",
      "const __turbo_default",
    );
    expect(iface).toBeLessThan(factory);
  });

  it("maps authored ranges back to the source 1:1", () => {
    expectRoundTrip(MAGIC_PROPS, "props.title");
    expectRoundTrip(MAGIC_PROPS, "title: string");
  });

  it("falls back to TurboProps when no Props is declared", () => {
    const { code } = transform(
      "export default (<header><h1>{props.title}</h1></header>);",
    );
    expect(code).toContain(
      "const __turbo_default = (props: TurboProps): JSX.Element => {",
    );
    expect(code).toContain("{props.title}");
  });

  it("keeps setup imports above the factory and setup statements inside it", () => {
    const { code } = transform(
      `import { signal } from "@turbo/reactivity";
const count = signal(0);
export default (<p>{count()}</p>);`,
    );
    expect(code).toContain('import { signal } from "@turbo/reactivity";');

    const [imp, factory, setup] = orderOf(
      code,
      "import { signal }",
      "const __turbo_default",
      "const count = signal(0)",
    );
    expect(imp).toBeLessThan(factory);
    expect(factory).toBeLessThan(setup);
  });

  it("leaves a function-form default export untouched", () => {
    const source = "export default (props: { x: number }) => <p>{props.x}</p>;";
    expect(transform(source).code).toBe(source);
  });

  it("leaves a module without a default export untouched", () => {
    const source = "export const x = 1;";
    expect(transform(source).code).toBe(source);
  });

  it("omits the JSX.Element annotation for a non-JSX default expression", () => {
    const { code } = transform("export default props.value;");
    expect(code).toContain("const __turbo_default = (props: TurboProps) => {");
    expect(code).not.toContain(": JSX.Element");
  });

  it("falls back to identity on a syntax error", () => {
    const source = "export default (<div>";
    const { code, mappings } = transform(source);
    expect(code).toBe(source);
    expect(mappings).toHaveLength(1);
  });

  it("derives a Props type from input()/output() bindings", () => {
    const { code } = transform(
      `import { input, output } from "@turbo/core";
const title = input("");
const count = input.required<number>();
const submit = output<string>();
export default (
  <button onClick={() => submit.emit(title())}>{count()}</button>
);`,
    );
    expect(code).toContain("type __TurboProps = {");
    expect(code).toContain("title?: TurboInputValue<typeof title>;");
    expect(code).toContain("count: TurboInputValue<typeof count>;");
    expect(code).toContain(
      "submit?: (value: TurboOutputValue<typeof submit>) => void;",
    );
    expect(code).toContain(
      "const __turbo_default = (_$props: __TurboProps): JSX.Element => {",
    );
    expect(code).toContain("export default __turbo_default;");
  });

  it("lifts input/output setup above the derived type so typeof is in scope", () => {
    const { code } = transform(
      `import { input } from "@turbo/core";
const title = input("");
export default (<p>{title()}</p>);`,
    );
    const [setup, type, factory] = orderOf(
      code,
      'const title = input("")',
      "type __TurboProps",
      "const __turbo_default",
    );
    expect(setup).toBeLessThan(type);
    expect(type).toBeLessThan(factory);
  });
});
