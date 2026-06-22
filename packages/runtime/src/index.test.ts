import { describe, it, expect, vi } from "vitest";
import { signal, memo, effect } from "@turbo/reactivity";
import {
  template,
  nodeAt,
  insert,
  setAttr,
  on,
  render,
  createComponent,
} from "./index";

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

describe("insert ownership", () => {
  it("disposes effects created by reactive content that is later removed", () => {
    const show = signal(true);
    const value = signal(0);
    const spy = vi.fn();

    const tmpl = template(`<div><!></div>`);
    const root = tmpl() as HTMLElement;

    insert(nodeAt(root, [0]), () => {
      if (!show()) return null;
      const span = document.createElement("span");
      const marker = span.appendChild(document.createComment(""));
      insert(marker, () => {
        spy();
        return value();
      });
      return span;
    });

    expect(spy).toHaveBeenCalledTimes(1);
    value.set(1);
    expect(spy).toHaveBeenCalledTimes(2);

    show.set(false);
    expect(root.querySelector("span")).toBeNull();

    value.set(2);
    expect(spy).toHaveBeenCalledTimes(2);
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

describe("createComponent", () => {
  it("returns a Node value unchanged (case 3)", () => {
    const node = document.createElement("div");
    expect(createComponent(node, {})).toBe(node);
  });

  it("treats a Node value as a singleton: used twice it moves", () => {
    const parent = document.createElement("div");
    const m1 = parent.appendChild(document.createComment(""));
    const m2 = parent.appendChild(document.createComment(""));
    const node = document.createElement("span");
    insert(m1, createComponent(node, {}));
    insert(m2, createComponent(node, {}));
    expect(parent.querySelectorAll("span")).toHaveLength(1);
  });

  it("makes a memo component reactive (case 2)", () => {
    const tmpl = template(`<div><!></div>`);
    const root = tmpl() as HTMLElement;
    const flag = signal(true);
    const C = memo(() => {
      const el = document.createElement("span");
      el.textContent = flag() ? "a" : "b";
      return el;
    });
    insert(nodeAt(root, [0]), createComponent(C, {}));
    expect(root.querySelector("span")?.textContent).toBe("a");
    flag.set(false);
    expect(root.querySelector("span")?.textContent).toBe("b");
  });

  it("makes a signal-of-Node component reactive (case 4)", () => {
    const tmpl = template(`<div><!></div>`);
    const root = tmpl() as HTMLElement;
    const a = document.createElement("a");
    const b = document.createElement("b");
    const C = signal<Node>(a);
    insert(nodeAt(root, [0]), createComponent(C, {}));
    expect(root.querySelector("a")).not.toBeNull();
    C.set(b);
    expect(root.querySelector("a")).toBeNull();
    expect(root.querySelector("b")).not.toBeNull();
  });

  it("constructs a function component once and untracked, passing props", () => {
    const outer = signal(0);
    const constructed = vi.fn();
    const Comp = (props: { name: string }) => {
      constructed(props.name);
      outer();
      const el = document.createElement("p");
      el.textContent = props.name;
      return el;
    };

    const effectSpy = vi.fn();
    let result: unknown;
    effect(() => {
      effectSpy();
      result = createComponent(Comp, { name: "x" });
    });

    expect(constructed).toHaveBeenCalledTimes(1);
    expect(constructed).toHaveBeenCalledWith("x");
    expect(typeof result).not.toBe("function");
    expect((result as HTMLElement).textContent).toBe("x");

    outer.set(1);
    expect(effectSpy).toHaveBeenCalledTimes(1);
  });

  it("keeps a function component's own effects reactive", () => {
    const inner = signal("a");
    const tmpl = template(`<div><!></div>`);
    const root = tmpl() as HTMLElement;
    const Comp = () => {
      const el = document.createElement("p");
      const marker = el.appendChild(document.createComment(""));
      insert(marker, () => inner());
      return el;
    };
    insert(nodeAt(root, [0]), createComponent(Comp, {}));
    expect(root.querySelector("p")?.textContent).toBe("a");
    inner.set("b");
    expect(root.querySelector("p")?.textContent).toBe("b");
  });

  it("resolves a nested accessor branch inside a conditional", () => {
    const tmpl = template(`<div><!></div>`);
    const root = tmpl() as HTMLElement;
    const show = signal(true);
    const label = signal("a");
    const C = memo(() => {
      const el = document.createElement("span");
      el.textContent = label();
      return el;
    });
    insert(nodeAt(root, [0]), () => (show() ? createComponent(C, {}) : null));
    expect(root.querySelector("span")?.textContent).toBe("a");
    label.set("b");
    expect(root.querySelector("span")?.textContent).toBe("b");
    show.set(false);
    expect(root.querySelector("span")).toBeNull();
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
