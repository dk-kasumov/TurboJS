import { describe, it, expect, vi } from "vitest";
import { signal } from "@turbo/reactivity";
import { template, nodeAt, insert, setAttr, on, render } from "./index";

describe("template + nodeAt", () => {
  it("clones a fresh node each call and walks by path", () => {
    const tmpl = template(`<div class="x"><h1>hi</h1><!></div>`);
    const a = tmpl();
    const b = tmpl();
    expect(a).not.toBe(b);
    expect((a as Element).outerHTML).toContain('class="x"');

    const h1 = nodeAt(a, [0]);
    expect((h1 as Element).tagName).toBe("H1");
    const marker = nodeAt(a, [1]);
    expect(marker.nodeType).toBe(8); // comment marker
  });
});

describe("insert", () => {
  it("inserts static text before the marker", () => {
    const tmpl = template(`<div><!></div>`);
    const root = tmpl() as HTMLElement;
    insert(nodeAt(root, [0]), "hello");
    expect(root.textContent).toBe("hello");
  });

  it("reactively updates when a thunk reads a signal", () => {
    const tmpl = template(`<div><!></div>`);
    const root = tmpl() as HTMLElement;
    const count = signal(0);
    insert(nodeAt(root, [0]), () => count());
    expect(root.textContent).toBe("0");
    count.set(5);
    expect(root.textContent).toBe("5");
    count.set(42);
    expect(root.textContent).toBe("42");
  });

  it("swaps element content reactively", () => {
    const tmpl = template(`<div><!></div>`);
    const root = tmpl() as HTMLElement;
    const show = signal(true);
    insert(nodeAt(root, [0]), () => {
      if (!show()) return null;
      const span = document.createElement("span");
      span.textContent = "on";
      return span;
    });
    expect(root.querySelector("span")?.textContent).toBe("on");
    show.set(false);
    expect(root.querySelector("span")).toBeNull();
  });
});

describe("setAttr", () => {
  it("sets, removes, and handles booleans", () => {
    const el = document.createElement("input");
    setAttr(el, "value", "x");
    expect(el.getAttribute("value")).toBe("x");
    setAttr(el, "disabled", true);
    expect(el.getAttribute("disabled")).toBe("");
    setAttr(el, "disabled", false);
    expect(el.hasAttribute("disabled")).toBe(false);
    setAttr(el, "value", null);
    expect(el.hasAttribute("value")).toBe(false);
  });
});

describe("on", () => {
  it("attaches a listener", () => {
    const el = document.createElement("button");
    const spy = vi.fn();
    on(el, "click", spy);
    el.dispatchEvent(new Event("click"));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("render", () => {
  it("mounts a component factory and instances are independent", () => {
    const container = document.createElement("div");
    // A hand-written factory, shaped exactly like the compiler's output.
    const Counter = () => {
      const c = signal(0);
      const el = document.createElement("button");
      const marker = document.createComment("");
      el.appendChild(marker);
      insert(marker, () => c());
      on(el, "click", () => c.set(c() + 1));
      return el;
    };

    render(Counter, container);
    render(Counter, container);
    const [a, b] = [...container.querySelectorAll("button")];

    expect(a.textContent).toBe("0");
    expect(b.textContent).toBe("0");
    a.dispatchEvent(new Event("click"));
    expect(a.textContent).toBe("1");
    expect(b.textContent).toBe("0"); // independent instance state
  });
});
