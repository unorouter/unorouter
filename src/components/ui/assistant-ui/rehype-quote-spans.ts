import type { Plugin } from "unified";
import type { Element, ElementContent, Root, RootContent, Text } from "hast";

const DQ_RE = /["“”][^"“”]+["“”]/g;
const OPEN_SINGLE = /['‘’]/g;
const isWord = (ch: string | undefined) =>
  ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
const isCloseQuote = (ch: string) => ch === "'" || ch === "’" || ch === "‘";

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

type Span = { start: number; end: number; kind: "dq" | "sq" };

function isSingleOpener(value: string, i: number): boolean {
  const prev = i > 0 ? value[i - 1] : undefined;
  const next = i + 1 < value.length ? value[i + 1] : undefined;
  if (isWord(prev)) return false; // apostrophe inside a word
  if (next === undefined || next === " " || next === "\t") return false;
  return true;
}

function findSingleCloser(value: string, from: number): number {
  for (let i = from; i < value.length; i++) {
    const ch = value[i];
    if (!isCloseQuote(ch)) continue;
    const next = i + 1 < value.length ? value[i + 1] : undefined;
    const prev = i > 0 ? value[i - 1] : undefined;
    if (prev === " " || prev === "\t") continue;
    if (isWord(next)) continue;
    return i;
  }
  return -1;
}

function collectSingleSpans(value: string, taken: Span[]): Span[] {
  const spans: Span[] = [];
  OPEN_SINGLE.lastIndex = 0;
  let m: RegExpExecArray | null;
  let cursor = 0;
  while ((m = OPEN_SINGLE.exec(value)) !== null) {
    const open = m.index;
    if (open < cursor) continue;
    if (taken.some((s) => open >= s.start && open < s.end)) continue;
    if (!isSingleOpener(value, open)) continue;
    const close = findSingleCloser(value, open + 1);
    if (close === -1) continue;
    if (taken.some((s) => close >= s.start && close < s.end)) continue;
    spans.push({ start: open, end: close + 1, kind: "sq" });
    cursor = close + 1;
    OPEN_SINGLE.lastIndex = cursor;
  }
  return spans;
}

function detectSpans(value: string): Span[] {
  if (!value) return [];
  const dqSpans: Span[] = [];
  DQ_RE.lastIndex = 0;
  let dm: RegExpExecArray | null;
  while ((dm = DQ_RE.exec(value)) !== null) {
    dqSpans.push({ start: dm.index, end: dm.index + dm[0].length, kind: "dq" });
  }
  const sqSpans = collectSingleSpans(value, dqSpans);
  return [...dqSpans, ...sqSpans].sort((a, b) => a.start - b.start);
}

function isQuotable(node: RootContent): node is ElementContent {
  if (node.type === "text") return true;
  if (node.type === "element") return !SKIP_TAGS.has(node.tagName);
  return false;
}

type Seg = { node: ElementContent; start: number; end: number; text: string };
const MASK = "·"; // middle dot: not a quote, not a word char
function flatten(children: ElementContent[]): { text: string; segs: Seg[] } {
  let text = "";
  const segs: Seg[] = [];
  for (const node of children) {
    const real = node.type === "text" ? node.value : elementText(node);
    const flat = node.type === "text" ? real : MASK.repeat(real.length);
    segs.push({
      node,
      start: text.length,
      end: text.length + real.length,
      text: real,
    });
    text += flat;
  }
  return { text, segs };
}

function elementText(node: RootContent): string {
  if (node.type === "text") return node.value;
  if (node.type !== "element" || !node.children) return "";
  let out = "";
  for (const c of node.children) out += elementText(c);
  return out;
}

function sliceText(node: Text, from: number, to: number): Text {
  return { type: "text", value: node.value.slice(from, to) };
}

function sliceRun(segs: Seg[], start: number, end: number): ElementContent[] {
  const out: ElementContent[] = [];
  for (const seg of segs) {
    if (seg.end <= start || seg.start >= end) continue; // outside the run
    const node = seg.node;
    if (node.type === "text") {
      const from = Math.max(0, start - seg.start);
      const to = Math.min(seg.text.length, end - seg.start);
      out.push(sliceText(node, from, to));
    } else {
      out.push(node);
    }
  }
  return out;
}

function wrapQuotableRun(children: ElementContent[]): ElementContent[] {
  if (children.length === 0) return children;
  const { text, segs } = flatten(children);
  const spans = detectSpans(text);
  if (spans.length === 0) return children;

  const out: ElementContent[] = [];
  let cursor = 0;
  for (const sp of spans) {
    if (sp.start > cursor) out.push(...sliceRun(segs, cursor, sp.start));
    out.push({
      type: "element",
      tagName: "span",
      properties: { dataMdQuote: sp.kind },
      children: sliceRun(segs, sp.start, sp.end),
    });
    cursor = sp.end;
  }
  if (cursor < text.length) out.push(...sliceRun(segs, cursor, text.length));
  return out;
}

function processChildren<TNode extends RootContent>(
  children: TNode[],
): (TNode | ElementContent)[] {
  for (const child of children) {
    if (child.type === "element" && !SKIP_TAGS.has(child.tagName)) {
      walkElement(child);
    }
  }
  const out: (TNode | ElementContent)[] = [];
  let run: ElementContent[] = [];
  const flush = () => {
    if (run.length > 0) {
      out.push(...wrapQuotableRun(run));
      run = [];
    }
  };
  for (const child of children) {
    if (isQuotable(child)) {
      run.push(child);
    } else {
      flush();
      out.push(child);
    }
  }
  flush();
  return out;
}

function walkElement(node: Element): void {
  if (!node.children) return;
  node.children = processChildren(node.children);
}

function walkRoot(node: Root): void {
  if (!node.children) return;
  node.children = processChildren(node.children);
}

export const rehypeQuoteSpans: Plugin<[], Root> = () => {
  return (tree: Root) => walkRoot(tree);
};
