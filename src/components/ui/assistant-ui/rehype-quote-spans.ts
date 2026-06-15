import type { Plugin } from "unified";
import type { Element, ElementContent, Root, RootContent, Text } from "hast";

// Wrap "double" and 'single' quoted runs in <span data-md-quote="dq|sq">.
// Skip code/pre/headings/math. Mirrors SillyTavern <q> behavior, exposed as
// data attr so the renderer can apply the user's theme color.
//
// Single quotes are boundary-aware (RisuAI/markdown-it typographer parity): an
// apostrophe inside a word (That's, shouldn't) is NOT a quote delimiter, so it
// never opens a run. A `'` only opens when preceded by start/whitespace/open
// punctuation and only closes when followed by end/whitespace/close punctuation.
// Without this, the naive pair regex colored the whole span from the apostrophe
// in one contraction to the next.

const DQ_RE = /["“”][^"“”]+["“”]/g;
const OPEN_SINGLE = /['‘’]/g;
const isWord = (ch: string | undefined) => ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
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

// A single-quote opener: a quote char preceded by start/non-word AND followed by
// a non-space (so " 'quoted'" opens but "it's" does not, word-char before `'`).
function isSingleOpener(value: string, i: number): boolean {
  const prev = i > 0 ? value[i - 1] : undefined;
  const next = i + 1 < value.length ? value[i + 1] : undefined;
  if (isWord(prev)) return false; // apostrophe inside a word
  if (next === undefined || next === " " || next === "\t") return false;
  return true;
}

// A single-quote closer for an open run started at `from`: a quote char whose
// next char is end/non-word (so the run terminates at a word boundary, not at a
// mid-word apostrophe like "don't" sitting inside the quoted text).
function findSingleCloser(value: string, from: number): number {
  for (let i = from; i < value.length; i++) {
    const ch = value[i];
    if (!isCloseQuote(ch)) continue;
    const next = i + 1 < value.length ? value[i + 1] : undefined;
    const prev = i > 0 ? value[i - 1] : undefined;
    // Closer must hug the quoted text (prev is non-space) and end at a boundary
    // (next is not a word char), which a contraction apostrophe never satisfies.
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

function splitTextNode(node: Text): ElementContent[] {
  const value = node.value;
  if (!value) return [node];

  const dqSpans: Span[] = [];
  DQ_RE.lastIndex = 0;
  let dm: RegExpExecArray | null;
  while ((dm = DQ_RE.exec(value)) !== null) {
    dqSpans.push({ start: dm.index, end: dm.index + dm[0].length, kind: "dq" });
  }
  const sqSpans = collectSingleSpans(value, dqSpans);
  const spans = [...dqSpans, ...sqSpans].sort((a, b) => a.start - b.start);
  if (spans.length === 0) return [node];

  const out: ElementContent[] = [];
  let last = 0;
  for (const sp of spans) {
    if (sp.start > last) {
      out.push({ type: "text", value: value.slice(last, sp.start) });
    }
    out.push({
      type: "element",
      tagName: "span",
      properties: { dataMdQuote: sp.kind },
      children: [{ type: "text", value: value.slice(sp.start, sp.end) }],
    });
    last = sp.end;
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
