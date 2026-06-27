import type { Plugin } from "unified";
import type { Element, ElementContent, Root, RootContent, Text } from "hast";

// Wrap "double" and 'single' quoted runs in <span data-md-quote="dq|sq">. Skip
// code/pre/headings/math. Mirrors SillyTavern <q> behavior, exposed as a data
// attr so the renderer can apply the user's theme color.
//
// Detection runs over a node's CHILD SEQUENCE, not single text nodes, so a quote
// whose run is interrupted by inline markdown still colors as one dialogue run:
//   "i cant believe *you* of all people said that!"
// renders as text + <em>you</em> + text siblings under <p>; the opening and
// closing quote land in DIFFERENT text nodes. Scanning per-text-node (the old
// behavior) never matched the pair, so the dialogue color was lost on the plain
// words and only the <em> kept a color. We flatten the inline run, detect the
// quote across it, and wrap the whole slice (text + the inner <em>/<strong>).
//
// Single quotes are boundary-aware (RisuAI/markdown-it typographer parity): an
// apostrophe inside a word (That's, shouldn't) is NOT a quote delimiter, so it
// never opens a run. A `'` only opens when preceded by start/whitespace/open
// punctuation and only closes when followed by end/whitespace/close punctuation.

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

// All quote spans (double first so single-quote detection can skip inside them).
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

// An inline child whose text participates in a quote run (text + inline
// formatting). A SKIP_TAGS element is opaque: it ends the current run.
function isQuotable(node: ElementContent): boolean {
  if (node.type === "text") return true;
  if (node.type === "element") return !SKIP_TAGS.has(node.tagName);
  return false;
}

// Flatten a contiguous run of quotable children into one string + a per-segment
// map so a detected [start,end) can be rebuilt back into HAST children.
//
// Text NODES contribute their real chars (quote delimiters here are the
// cross-sibling case we color). Inline ELEMENTS contribute MASK chars of equal
// length (their real text length, for offset alignment) so the outer scan never
// treats a quote char INSIDE an element as a delimiter: a quote living wholly
// inside one <em> is handled by that element's own recursion, not here. The mask
// is a non-quote, non-word filler so it neither opens/closes a quote nor blocks
// a single-quote word boundary check at the element edge.
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

// Concatenated text content of an element subtree (for offset accounting).
function elementText(node: ElementContent): string {
  if (node.type === "text") return node.value;
  if (node.type !== "element" || !node.children) return "";
  let out = "";
  for (const c of node.children) out += elementText(c as ElementContent);
  return out;
}

// Slice a text node to [from,to) in its own value.
function sliceText(node: Text, from: number, to: number): Text {
  return { type: "text", value: node.value.slice(from, to) };
}

// Build the children covered by a quote span [span.start, span.end) over `segs`.
// Boundary text nodes are split at the offsets; whole inline elements inside the
// run are kept intact (they've already been recursed for nested formatting).
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
      // Inline element fully or partially in the run: keep whole (quote chars
      // rarely sit inside an <em>; including it whole keeps formatting intact).
      out.push(node);
    }
  }
  return out;
}

// Wrap quote runs found across a contiguous quotable child sequence.
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

// Process a parent's children: recurse into inline elements first (nested
// formatting), segment by quotable runs (SKIP_TAGS elements break a run and pass
// through untouched), then wrap quotes across each run.
function processChildren(children: ElementContent[]): ElementContent[] {
  // Recurse into non-skip elements so nested em/strong render; their own quote
  // scanning is owned by the outer run, so we DON'T re-scan inside them here.
  for (const child of children) {
    if (child.type === "element" && !SKIP_TAGS.has(child.tagName)) {
      walkElement(child);
    }
  }
  const out: ElementContent[] = [];
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
  node.children = processChildren(node.children as ElementContent[]);
}

function walkRoot(node: Root): void {
  if (!node.children) return;
  // Root children may include non-inline content; processChildren handles the
  // mix (block elements get recursed, text/inline runs get quote-wrapped).
  node.children = processChildren(
    node.children as unknown as ElementContent[],
  ) as unknown as RootContent[];
}

export const rehypeQuoteSpans: Plugin<[], Root> = () => {
  return (tree: Root) => walkRoot(tree);
};
