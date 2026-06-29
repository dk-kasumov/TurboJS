import { describe, it, expect } from "vitest";
import { useStyle } from "./index";

const tagsFor = (css: string) =>
  [...document.head.querySelectorAll("style")].filter((s) => s.textContent === css);

describe("useStyle", () => {
  it("injects a style tag into the head", () => {
    const css = ".btn[t-aaa]{color:tomato}";
    useStyle(css);
    expect(tagsFor(css)).toHaveLength(1);
  });

  it("injects identical css only once, ignoring repeat calls", () => {
    const css = ".x[t-bbb]{color:red}";
    useStyle(css);
    useStyle(css);
    useStyle(css);
    expect(tagsFor(css)).toHaveLength(1);
  });
});
