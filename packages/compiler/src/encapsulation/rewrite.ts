import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

const isKeyframes = (rule: postcss.Rule): boolean =>
  rule.parent?.type === "atrule" &&
  /keyframes$/i.test((rule.parent as postcss.AtRule).name);

function scopeSelector(selector: string, attr: string): string {
  const scopeAttr = () =>
    selectorParser.attribute({ attribute: attr, value: undefined, raws: {} });

  return selectorParser((selectors) => {
    selectors.each((sel) => {
      type Child = (typeof sel.nodes)[number];
      const targets: Child[] = [];
      let last: Child | null = null;
      sel.each((node) => {
        if (node.type === "combinator") {
          if (last) targets.push(last);
          last = null;
        } else if (node.type !== "pseudo") {
          last = node;
        }
      });
      if (last) targets.push(last);

      if (targets.length === 0) {
        sel.append(scopeAttr());
        return;
      }
      for (const node of targets) sel.insertAfter(node, scopeAttr());
    });
  }).processSync(selector);
}

export function rewriteCss(css: string, attr: string): string {
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (isKeyframes(rule)) return;
    rule.selector = scopeSelector(rule.selector, attr);
  });
  return root.toString();
}
