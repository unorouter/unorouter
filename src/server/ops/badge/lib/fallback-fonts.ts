import { readFileSync } from "fs";
import { join } from "path";
import type { SatoriOptions } from "satori";

// Satori does NO automatic font fallback; loading is LAZY per script to keep ~30MB
// of CJK fonts out of other pages. Arabic is deliberately absent: every Noto Arabic
// uses GSUB lookupType 5, which Satori's opentype.js cannot shape and throws on, so
// Arabic goes through arabic-shaper.ts instead.

type FallbackFont = NonNullable<SatoriOptions["fonts"]>[number];

const dir = join(
  process.cwd(),
  "src",
  "server",
  "ops",
  "badge",
  "fonts",
  "fallback",
);

type ScriptDef = {
  file: string;
  name: string;
  test: RegExp;
};

// SC is the broadest Han coverage, so kana/hangul must be tested BEFORE the Han range.
const SCRIPTS: ScriptDef[] = [
  { file: "NotoSansJP-Regular.otf", name: "Noto Sans JP", test: /[぀-ヿ]/ }, // kana
  { file: "NotoSansKR-Regular.otf", name: "Noto Sans KR", test: /[가-힣ᄀ-ᇿ]/ }, // hangul
  {
    file: "NotoSansSC-Regular.otf",
    name: "Noto Sans SC",
    test: /[㐀-鿿豈-﫿]/,
  }, // han
  {
    file: "NotoSansHebrew-Regular.ttf",
    name: "Noto Sans Hebrew",
    test: /[֐-׿]/,
  },
  {
    file: "NotoSansDevanagari-Regular.ttf",
    name: "Noto Sans Devanagari",
    test: /[ऀ-ॿ]/,
  },
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

export function fallbackFontsFor(text: string): FallbackFont[] {
  if (!text) return [];
  const out: FallbackFont[] = [];
  for (const def of SCRIPTS) {
    if (def.test.test(text)) out.push(load(def));
  }
  return out;
}
