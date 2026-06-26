import { describe, it, expect, vi } from "vitest";
import { signal, memo, effect, onCleanup } from "@turbo/reactivity";
import {
  template,
  nodeAt,
  insert,
  setAttr,
  on,
  render,
  createComponent,
} from "./index";

function host() {
  const root = template(`<div><!></div>`)() as HTMLElement;
  return { root, marker: nodeAt(root, [0]) };
}

function span(text: string): HTMLSpanElement {
  const el = document.createElement("span");
  el.textContent = text;
  return el;
}

describe("template + nodeAt", () => {
  it("clones a fresh tree each call and walks it by index path", () => {
    const make = template(`<div class="x"><h1>hi</h1><!></div>`);
    expect(make()).not.toBe(make());

    const root = make();
    expect((nodeAt(root, [0]) as Element).tagName).toBe("H1");
    expect(nodeAt(root, [1]).nodeType).toBe(Node.COMMENT_NODE);
  });
});

describe("insert", () => {
  it("renders a static value before the marker", () => {
    const { root, marker } = host();
    insert(marker, "hello");
    expect(root.textContent).toBe("hello");
  });

  it("re-renders text when a thunk's signal changes", () => {
    const { root, marker } = host();
    const count = signal(0);
    insert(marker, () => count());
    expect(root.textContent).toBe("0");
    count.set(42);
    expect(root.textContent).toBe("42");
  });

  it("swaps element content when a thunk toggles", () => {
    const { root, marker } = host();
    const show = signal(true);
    insert(marker, () => (show() ? span("on") : null));
    expect(root.querySelector("span")?.textContent).toBe("on");
    show.set(false);
    expect(root.querySelector("span")).toBeNull();
  });

  it("disposes effects owned by content that is later removed", () => {
    const { root, marker } = host();
    const show = signal(true);
    const value = signal(0);
    const spy = vi.fn();

    insert(marker, () => {
      if (!show()) return null;
      const el = span("");
      insert(el.appendChild(document.createComment("")), () => spy(value()));
      return el;
    });
    expect(spy).toHaveBeenCalledTimes(1);

    value.set(1);
    expect(spy).toHaveBeenCalledTimes(2);

    show.set(false);
    value.set(2);
    expect(root.querySelector("span")).toBeNull();
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe("setAttr", () => {
  it("writes strings, clears null, and toggles booleans", () => {
    const el = document.createElement("input");

    setAttr(el, "value", "x");
    expect(el.getAttribute("value")).toBe("x");

    setAttr(el, "value", null);
    expect(el.hasAttribute("value")).toBe(false);

    setAttr(el, "disabled", true);
    expect(el.getAttribute("disabled")).toBe("");
    setAttr(el, "disabled", false);
    expect(el.hasAttribute("disabled")).toBe(false);
  });
});

describe("on", () => {
  it("attaches an event listener", () => {
    const el = document.createElement("button");
    const spy = vi.fn();
    on(el, "click", spy);
    el.dispatchEvent(new Event("click"));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("createComponent", () => {
  it("returns a Node value as-is and treats it as a singleton", () => {
    const node = span("once");
    expect(createComponent(node, {})).toBe(node);

    const parent = document.createElement("div");
    const first = parent.appendChild(document.createComment(""));
    const second = parent.appendChild(document.createComment(""));
    insert(first, createComponent(node, {}));
    insert(second, createComponent(node, {}));
    expect(parent.querySelectorAll("span")).toHaveLength(1);
  });

  it("stays reactive for a signal-of-Node component", () => {
    const { root, marker } = host();
    const a = document.createElement("a");
    const b = document.createElement("b");
    const current = signal<Node>(a);

    insert(marker, createComponent(current, {}));
    expect(root.querySelector("a")).not.toBeNull();

    current.set(b);
    expect(root.querySelector("a")).toBeNull();
    expect(root.querySelector("b")).not.toBeNull();
  });

  it("constructs a function component once, untracked, with its props", () => {
    const outer = signal(0);
    const constructed = vi.fn();
    const Comp = (props: { name: string }) => {
      constructed(props.name);
      outer();
      return span(props.name);
    };

    let node: unknown;
    const rerun = vi.fn();
    effect(() => {
      rerun();
      node = createComponent(Comp, { name: "x" });
    });

    expect(constructed).toHaveBeenCalledTimes(1);
    expect(constructed).toHaveBeenCalledWith("x");
    expect((node as HTMLElement).textContent).toBe("x");

    outer.set(1);
    expect(rerun).toHaveBeenCalledTimes(1);
  });

  it("keeps a function component's own effects reactive", () => {
    const { root, marker } = host();
    const inner = signal("a");
    const Comp = () => {
      const el = document.createElement("p");
      insert(el.appendChild(document.createComment("")), () => inner());
      return el;
    };

    insert(marker, createComponent(Comp, {}));
    expect(root.querySelector("p")?.textContent).toBe("a");
    inner.set("b");
    expect(root.querySelector("p")?.textContent).toBe("b");
  });

  it("resolves a memo component nested inside a conditional", () => {
    const { root, marker } = host();
    const show = signal(true);
    const label = signal("a");
    const C = memo(() => span(label()));

    insert(marker, () => (show() ? createComponent(C, {}) : null));
    expect(root.querySelector("span")?.textContent).toBe("a");

    label.set("b");
    expect(root.querySelector("span")?.textContent).toBe("b");

    show.set(false);
    expect(root.querySelector("span")).toBeNull();
  });
});

describe("render", () => {
  it("mounts a factory and gives each instance independent state", () => {
    const container = document.createElement("div");
    const Counter = () => {
      const count = signal(0);
      const el = document.createElement("button");
      insert(el.appendChild(document.createComment("")), () => count());
      on(el, "click", () => count.set(count() + 1));
      return el;
    };

    render(Counter, container);
    render(Counter, container);
    const [a, b] = [...container.querySelectorAll("button")];

    a.dispatchEvent(new Event("click"));
    expect(a.textContent).toBe("1");
    expect(b.textContent).toBe("0");
  });

  it("runs setup cleanups when the disposer is called", () => {
    const container = document.createElement("div");
    const destroyed = vi.fn();
    const App = () => {
      onCleanup(destroyed);
      return document.createElement("div");
    };

    const dispose = render(App, container);
    expect(destroyed).not.toHaveBeenCalled();
    dispose();
    expect(destroyed).toHaveBeenCalledTimes(1);
  });
});
