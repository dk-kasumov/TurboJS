import { describe, it, expect } from "vitest";
import { findStyleLink } from "./style-link.ts";

const at = (src: string, needle: string) => src.indexOf(needle) + 2;

describe("findStyleLink", () => {
  it("resolves a single styles string under the cursor", () => {
    const src = `import { component } from "@turbo/core";
export const config = component({ styles: "./button.css" });
export default <button />;`;
    const link = findStyleLink(src, at(src, "./button.css"));
    expect(link?.specifier).toBe("./button.css");
    expect(src.slice(link!.start, link!.end)).toBe('"./button.css"');
  });

  it("resolves the element of a styles array under the cursor", () => {
    const src = `import { component } from "@turbo/core";
export const config = component({ styles: ["./a.css", "./b.css"] });`;
    expect(findStyleLink(src, at(src, "./a.css"))?.specifier).toBe("./a.css");
    expect(findStyleLink(src, at(src, "./b.css"))?.specifier).toBe("./b.css");
  });

  it("works without the component() wrapper", () => {
    const src = `export const config = { styles: "./x.css" };`;
    expect(findStyleLink(src, at(src, "./x.css"))?.specifier).toBe("./x.css");
  });

  it("returns null off the styles string", () => {
    const src = `export const config = component({ styles: "./x.css" });
export default <button class="btn" />;`;
    expect(findStyleLink(src, at(src, "btn"))).toBeNull();
    expect(findStyleLink(src, 0)).toBeNull();
  });

  it("returns null when there is no config", () => {
    expect(findStyleLink(`export default <p>hi</p>;`, 10)).toBeNull();
  });

  it("does not throw on unparseable source", () => {
    expect(findStyleLink(`export const config = component({ styles:`, 5)).toBeNull();
  });
});
