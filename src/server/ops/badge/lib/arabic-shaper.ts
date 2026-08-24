import { readFileSync } from "fs";
import { join } from "path";
import { Blob, Buffer as HbBuffer, Face, Font, shape } from "harfbuzzjs";

// Satori's opentype.js engine rejects GSUB lookupType 5 (contextual joining),
// so HarfBuzz shapes Arabic here and the outlines ship to Satori as an SVG
// <img>. Runs normalize to a 1000 unit em so the two fonts line up.
const EM = 1000;

// Arabic block + presentation forms.
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
function isArabicChar(ch: string): boolean {
  return ARABIC_RE.test(ch);
}
// Direction-neutral chars attach to the current run, so "GPT" stays one run.
function isNeutralChar(ch: string): boolean {
  return /[\s0-9.,:;!?/()[\]{}<>|@#%&*+=_~'"^-]/.test(ch);
}

function hasArabic(text: string): boolean {
  return ARABIC_RE.test(text);
}

type LoadedFont = { font: InstanceType<typeof Font>; upem: number };
const fontCache = new Map<string, LoadedFont>();

function loadFont(file: string): LoadedFont {
  const cached = fontCache.get(file);
  if (cached) return cached;
  const data = readFileSync(
    join(process.cwd(), "src", "server", "ops", "badge", "fonts", file),
  );
  const ab = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  );
  const face = new Face(new Blob(ab), 0);
  const upem = face.upem;
  const font = new Font(face);
  font.setScale(upem, upem);
  const loaded = { font, upem };
  fontCache.set(file, loaded);
  return loaded;
}

const arabicFont = () => loadFont("fallback/NotoSansArabic-Regular.ttf");
const latinFont = () => loadFont("space-grotesk-400.ttf");

type Run = { arabic: boolean; text: string };

function segment(text: string): Run[] {
  const runs: Run[] = [];
  let cur: Run | undefined;
  for (const ch of text) {
    const kind: boolean = isArabicChar(ch)
      ? true
      : isNeutralChar(ch)
        ? cur
          ? cur.arabic
          : true
        : false;
    if (!cur || cur.arabic !== kind) {
      cur = { arabic: kind, text: ch };
      runs.push(cur);
    } else {
      cur.text += ch;
    }
  }
  return runs;
}

// Shapes at the font's own upem; paths and advance come back scaled to EM.
function shapeRun(run: Run): { paths: string; advance: number } {
  const { font, upem } = run.arabic ? arabicFont() : latinFont();
  const buf = new HbBuffer();
  buf.addText(run.text);
  buf.guessSegmentProperties(); // per-run: Arabic -> RTL/Arab, Latin -> LTR/Latn
  shape(font, buf);
  const glyphs = buf.getGlyphInfosAndPositions();
  const s = EM / upem;
  let x = 0;
  let paths = "";
  for (const g of glyphs) {
    const d = font.glyphToPath(g.codepoint);
    const xOffset = g.xOffset ?? 0;
    const yOffset = g.yOffset ?? 0;
    if (d) {
      paths += `<path d="${d}" transform="translate(${(x + xOffset) * s} ${-yOffset * s}) scale(${s})"/>`;
    }
    x += g.xAdvance ?? 0;
  }
  return { paths, advance: x * s };
}

export type ShapedText = { src: string; width: number; height: number };

export function shapeArabic(
  text: string,
  pxSize: number,
  color: string,
): ShapedText | null {
  if (!hasArabic(text)) return null;

  const runs = segment(text).map((r) => ({ ...r, ...shapeRun(r) }));
  const total = runs.reduce((sum, r) => sum + r.advance, 0) || EM;

  // RTL: the first logical run sits at the right edge.
  let cursor = total;
  let body = "";
  for (const run of runs) {
    cursor -= run.advance;
    body += `<g transform="translate(${cursor} 0)">${run.paths}</g>`;
  }

  const scale = pxSize / EM;
  const width = Math.ceil(total * scale);
  const height = Math.ceil(pxSize);
  // Font space is y-up with baseline at 0; SVG is y-down, hence the flip below.
  const baseline = EM * 0.8;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${total} ${EM}">` +
    `<g transform="translate(0 ${baseline}) scale(1 -1)" fill="${color}">${body}</g></svg>`;

  return {
    src: `data:image/svg+xml;base64,${globalThis.Buffer.from(svg).toString("base64")}`,
    width,
    height,
  };
}
