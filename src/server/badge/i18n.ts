import { createTranslator } from "use-intl/core";
import type { Locale } from "next-intl";
import { LOCALES } from "@/lib/config/constants";
import { readFileSync } from "fs";
import { join } from "path";

const cache = new Map<Locale, ReturnType<typeof createTranslator>>();

function getTranslator(locale: Locale) {
  const cached = cache.get(locale);
  if (cached) return cached;

  const path = join(process.cwd(), "public", "i18n", `${locale}.json`);
  const messages = JSON.parse(readFileSync(path, "utf-8"));
  const translator = createTranslator({ locale, messages });
  cache.set(locale, translator);
  return translator;
}

export function t(locale: Locale, key: string): string {
  const translator = getTranslator(locale);
  try {
    return translator(key as never);
  } catch {
    if (locale !== "en") {
      const en = getTranslator("en");
      return en(key as never);
    }
    return key;
  }
}

export function parseLocale(raw: string | undefined): Locale {
  if (LOCALES.includes(raw as Locale)) return raw as Locale;
  return "en";
}
