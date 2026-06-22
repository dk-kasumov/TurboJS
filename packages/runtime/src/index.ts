import { effect } from "@turbo/reactivity";

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

  if (typeof value !== 'function') {
    for (const node of toNodes(value)) {
      parent.insertBefore(node, marker);
    }
    return;
  }

  let current: Node[] = [];
  
  effect(() => {
    const next = toNodes((value as () => unknown)());
    if (
      current.length === 1 &&
      next.length === 1 &&
      current[0].nodeType === 3 &&
      next[0].nodeType === 3
    ) {
      (current[0] as Text).data = (next[0] as Text).data;
      return;
    }
    for (const n of current) if (n.parentNode === parent) parent.removeChild(n);
    for (const n of next) parent.insertBefore(n, marker);
    current = next;
  });
}

export function setAttr(el: Element, name: string, value: unknown): void {
  if (value == null || value === false) el.removeAttribute(name);
  else if (value === true) el.setAttribute(name, "");
  else el.setAttribute(name, String(value));
}

export type Component<P = any> = (props: P) => Node;

export function render(
  component: Component,
  container: Element | string,
): Node {
  const el =
    typeof container === "string"
      ? document.querySelector(container)
      : container;
  if (!el) throw new Error(`turbo: render target not found: ${container}`);
  const node = component({});
  el.appendChild(node);
  return node;
}

export function on(
  el: Element,
  type: string,
  handler: EventListenerOrEventListenerObject,
): void {
  el.addEventListener(type, handler);
}



