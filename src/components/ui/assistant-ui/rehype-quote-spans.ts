import type { Plugin } from "unified";
import type { Element, ElementContent, Root, RootContent, Text } from "hast";

// Wrap "double" and 'single' quoted runs in <span data-md-quote="dq|sq">.
// Skip code/pre/headings/math. Mirrors SillyTavern <q> behavior, exposed as
// data attr so the renderer can apply the user's theme color.

const QUOTE_RE = /(["“”][^"“”]+["“”])|(['‘’][^'‘’]+['‘’])/g;

const SKIP_TAGS = new Set([
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "math",
  "mjx-container",
  "svg",
]);

function splitTextNode(node: Text): ElementContent[] {
  const value = node.value;
  if (!value) return [node];
  const matches = Array.from(value.matchAll(QUOTE_RE));
  if (matches.length === 0) return [node];
  const out: ElementContent[] = [];
  let last = 0;
  for (const m of matches) {
    const idx = m.index ?? 0;
    if (idx > last) {
      out.push({ type: "text", value: value.slice(last, idx) });
    }
    const matched = m[0];
    const isDouble = m[1] != null;
    out.push({
      type: "element",
      tagName: "span",
      properties: { dataMdQuote: isDouble ? "dq" : "sq" },
      children: [{ type: "text", value: matched }],
    });
    last = idx + matched.length;
  }
  if (last < value.length) {
    out.push({ type: "text", value: value.slice(last) });
  }
  return out;
}

function walkElement(node: Element): void {
  const out: ElementContent[] = [];
  for (const child of node.children) {
    if (child.type === "text") {
      for (const part of splitTextNode(child)) out.push(part);
    } else if (child.type === "element") {
      if (!SKIP_TAGS.has(child.tagName)) walkElement(child);
      out.push(child);
    } else {
      out.push(child);
    }
  }
  node.children = out;
}

function walkRoot(node: Root): void {
  const out: RootContent[] = [];
  for (const child of node.children) {
    if (child.type === "text") {
      for (const part of splitTextNode(child)) out.push(part);
    } else if (child.type === "element") {
      if (!SKIP_TAGS.has(child.tagName)) walkElement(child);
      out.push(child);
    } else {
      out.push(child);
    }
  }
  node.children = out;
}

export const rehypeQuoteSpans: Plugin<[], Root> = () => {
  return (tree: Root) => walkRoot(tree);
};
