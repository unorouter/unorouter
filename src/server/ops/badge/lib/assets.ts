import { LOCALES } from "@/lib/config/constants";
import { readFileSync } from "fs";
import type { Locale } from "next-intl";
import { join } from "path";
import type { SatoriOptions } from "satori";
import { createTranslator } from "use-intl/core";

const logoSvg = readFileSync(
  join(process.cwd(), "public", "images", "logo", "logo.svg"),
  "utf-8",
);

export const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

export const logoInnerSvg =
  logoSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1].trim() ?? "";

const fontsDir = join(process.cwd(), "src", "server", "ops", "badge", "fonts");

export const fonts: SatoriOptions["fonts"] = [
  {
    name: "Space Grotesk",
    data: readFileSync(join(fontsDir, "space-grotesk-400.ttf")),
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "Space Grotesk",
    data: readFileSync(join(fontsDir, "space-grotesk-700.ttf")),
    weight: 700 as const,
    style: "normal" as const,
  },
  {
    name: "JetBrains Mono",
    data: readFileSync(join(fontsDir, "jetbrains-mono-700.ttf")),
    weight: 700 as const,
    style: "normal" as const,
  },
];

const translatorCache = new Map<Locale, ReturnType<typeof createTranslator>>();

function getTranslator(locale: Locale) {
  const cached = translatorCache.get(locale);
  if (cached) return cached;

  const path = join(process.cwd(), "public", "i18n", `${locale}.json`);
  const messages = JSON.parse(readFileSync(path, "utf-8"));
  const translator = createTranslator({ locale, messages });
  translatorCache.set(locale, translator);
  return translator;
}

export function t(locale: Locale, key: string): string {
  const translator = getTranslator(locale);
  try {
    return translator(key as never);
  } catch {
    if (locale !== LOCALES[0]) {
      const en = getTranslator(LOCALES[0]);
      return en(key as never);
    }
    return key;
  }
}
