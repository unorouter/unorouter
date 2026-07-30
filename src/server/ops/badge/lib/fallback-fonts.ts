import { readFileSync } from "fs";
import { join } from "path";
import type { SatoriOptions } from "satori";

// Satori does NO automatic font fallback: a glyph absent from the Latin brand
// fonts renders as tofu. These Noto fallbacks cover the non-Latin badge locales
// (CJK, Hebrew, Devanagari). They are LAZY + per-script: a font file is read
// only the first time a badge actually contains that script, and each is cached
// for the process lifetime. Nothing outside the badge render path imports this,
// so the ~30MB of CJK fonts never touch any other page's memory or bundle.
//
// Arabic is intentionally absent: every Noto Arabic uses GSUB lookupType 5
// (contextual joining) which Satori's opentype.js engine cannot shape, so it
// would throw. Arabic badges keep their prior (tofu) rendering rather than 500.

type FallbackFont = NonNullable<SatoriOptions["fonts"]>[number];

const dir = join(process.cwd(), "src", "server", "ops", "badge", "fonts", "fallback");

type ScriptDef = {
  file: string;
  name: string;
  // Unicode ranges that should trigger this font.
  test: RegExp;
};

// Order matters only for disjoint ranges; each range is exclusive to one script
// except CJK, where SC is the broadest Han coverage and handles TC/JP/KR Han too
// (kana/hangul ranges pick JP/KR explicitly before the shared Han check).
const SCRIPTS: ScriptDef[] = [
  { file: "NotoSansJP-Regular.otf", name: "Noto Sans JP", test: /[぀-ヿ]/ }, // kana
  { file: "NotoSansKR-Regular.otf", name: "Noto Sans KR", test: /[가-힣ᄀ-ᇿ]/ }, // hangul
  { file: "NotoSansSC-Regular.otf", name: "Noto Sans SC", test: /[㐀-鿿豈-﫿]/ }, // han
  { file: "NotoSansHebrew-Regular.ttf", name: "Noto Sans Hebrew", test: /[֐-׿]/ },
  { file: "NotoSansDevanagari-Regular.ttf", name: "Noto Sans Devanagari", test: /[ऀ-ॿ]/ },
];

const cache = new Map<string, FallbackFont>();

function load(def: ScriptDef): FallbackFont {
  const cached = cache.get(def.file);
  if (cached) return cached;
  const font: FallbackFont = {
    name: def.name,
    data: readFileSync(join(dir, def.file)),
    weight: 400,
    style: "normal",
  };
  cache.set(def.file, font);
  return font;
}

// Returns the fallback fonts whose script appears in `text`, loading each lazily.
export function fallbackFontsFor(text: string): FallbackFont[] {
  if (!text) return [];
  const out: FallbackFont[] = [];
  for (const def of SCRIPTS) {
    if (def.test.test(text)) out.push(load(def));
  }
  return out;
}
