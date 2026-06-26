import { batch, createRoot, effect, untrack, isAccessor } from "@turbo/reactivity";

export { effect };

export function template(html: string): () => Node {
  let node: ChildNode | null = null;
  
  return () => {
    if (!node) {
      const t = document.createElement("template");
      t.innerHTML = html;
      node = t.content.firstChild;
    }

    return node!.cloneNode(true);
  };
}

export function nodeAt(root: Node, path: number[]): Node {
  let node = root;
  for (const i of path) node = node.childNodes[i]!;
  return node;
}

function toNodes(value: unknown): Node[] {
  if (typeof value === "function") return toNodes((value as () => unknown)());
  if (value == null || value === false || value === true) return [];

  if (Array.isArray(value)) return value.flatMap(toNodes);
  if (value instanceof Node) return [value];
  return [document.createTextNode(String(value))];
}

export function insert(marker: Node, value: unknown): void {
  const parent = marker.parentNode;
  if (!parent) {
    throw new Error("Turbo: insert marker has no parent");
  }

  if (typeof value !== "function") {
    for (const node of toNodes(value)) parent.insertBefore(node, marker);
    return;
  }

  let current: Node[] = [];
  effect(() => {
    current = reconcile(parent, marker, current, toNodes((value as () => unknown)()));
  });
}

function isText(node: Node): node is Text {
  return node.nodeType === 3;
}

function reconcile(parent: Node, marker: Node, current: Node[], next: Node[]): Node[] {
  if (current.length === 1 && next.length === 1 && isText(current[0]) && isText(next[0])) {
    current[0].data = next[0].data;
    return current;
  }
  for (const n of current) if (n.parentNode === parent) parent.removeChild(n);
  for (const n of next) parent.insertBefore(n, marker);
  return next;
}

export function setAttr(el: Element, name: string, value: unknown): void {
  if (value == null || value === false) el.removeAttribute(name);
  else if (value === true) el.setAttribute(name, "");
  else el.setAttribute(name, String(value));
}

export type Component<P = any> = (props: P) => Node;

export function createComponent(component: unknown, props: any): unknown {
  if (isAccessor(component)) return () => component();
  if (typeof component === "function") return untrack(() => component(props));
  return component;
}

export function render(
  component: Component,
  container: Element | string,
): () => void {
  const el =
    typeof container === "string"
      ? document.querySelector(container)
      : container;
  if (!el) throw new Error(`turbo: render target not found: ${container}`);

  return createRoot((dispose) => {
    const nodes = toNodes(component({}));
    for (const node of nodes) el.appendChild(node);
    return () => {
      dispose();
      for (const node of nodes) if (node.parentNode === el) el.removeChild(node);
    };
  });
}

export function on(
  el: Element,
  type: string,
  handler: EventListenerOrEventListenerObject,
): void {
  if (typeof handler === "function") {
    el.addEventListener(type, (event) => batch(() => handler(event)));
  } else {
    el.addEventListener(type, handler);
  }
}



