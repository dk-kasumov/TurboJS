import { describe, it, expect } from "vitest";
import type { CodeMapping } from "@volar/language-core";
import { transform } from "./transform";

function toGenerated(mappings: CodeMapping[], sourceOffset: number): number {
  for (const map of mappings) {
    for (let i = 0; i < map.sourceOffsets.length; i++) {
      const start = map.sourceOffsets[i];
      const end = start + map.lengths[i];
      if (sourceOffset >= start && sourceOffset < end) {
        return map.generatedOffsets[i] + (sourceOffset - start);
      }
    }
  }
  return -1;
}

function expectRoundTrip(source: string, needle: string): void {
  const { code, mappings } = transform(source);
  const sourceOffset = source.indexOf(needle);
  expect(sourceOffset).toBeGreaterThanOrEqual(0);
  const generatedOffset = toGenerated(mappings, sourceOffset);
  expect(generatedOffset).toBeGreaterThanOrEqual(0);
  expect(code.slice(generatedOffset, generatedOffset + needle.length)).toBe(
    needle,
  );
}

describe("transform", () => {
  it("(a) wraps a magic-props component with a declared interface Props", () => {
    const source = [
      "interface Props {",
      "  title: string;",
      "}",
      "",
      "export default (",
      '  <header><h1>{props.title}</h1></header>',
      ");",
    ].join("\n");

    const { code } = transform(source);

    expect(code).toContain("interface Props {");
    expect(code).toContain(
      "const __turbo_default = (props: Props): JSX.Element => {",
    );
    expect(code).toContain("return (");
    expect(code).toContain("{props.title}");
    expect(code).toContain("export default __turbo_default;");
    expect(code.indexOf("interface Props")).toBeLessThan(
      code.indexOf("const __turbo_default"),
    );
  });

  it("(a) maps authored ranges back 1:1", () => {
    const source = [
      "interface Props {",
      "  title: string;",
      "}",
      "export default (",
      '  <header><h1>{props.title}</h1></header>',
      ");",
    ].join("\n");

    expectRoundTrip(source, "props.title");
    expectRoundTrip(source, "title: string");
  });

  it("(b) falls back to TurboProps when no Props is declared", () => {
    const source = "export default (<header><h1>{props.title}</h1></header>);";
    const { code } = transform(source);

    expect(code).toContain(
      "const __turbo_default = (props: TurboProps): JSX.Element => {",
    );
    expect(code).toContain("{props.title}");
  });

  it("(b) keeps setup statements inside the factory body", () => {
    const source = [
      'import { signal } from "@turbo/reactivity";',
      "const count = signal(0);",
      "export default (<p>{count()}</p>);",
    ].join("\n");

    const { code } = transform(source);

    expect(code).toContain('import { signal } from "@turbo/reactivity";');
    expect(code.indexOf("import { signal }")).toBeLessThan(
      code.indexOf("const __turbo_default"),
    );
    expect(code.indexOf("const count = signal(0)")).toBeGreaterThan(
      code.indexOf("const __turbo_default"),
    );
  });

  it("(c) leaves a function-form default export untouched", () => {
    const source = "export default (props: { x: number }) => <p>{props.x}</p>;";
    const { code } = transform(source);
    expect(code).toBe(source);
  });

  it("leaves a module without a default export untouched", () => {
    const source = "export const x = 1;";
    const { code } = transform(source);
    expect(code).toBe(source);
  });

  it("omits the JSX.Element annotation for a non-JSX default expression", () => {
    const source = "export default props.value;";
    const { code } = transform(source);
    expect(code).toContain("const __turbo_default = (props: TurboProps) => {");
    expect(code).not.toContain(": JSX.Element");
  });

  it("falls back to identity on a syntax error", () => {
    const source = "export default (<div>";
    const { code, mappings } = transform(source);
    expect(code).toBe(source);
    expect(mappings.length).toBe(1);
  });
});
