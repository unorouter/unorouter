import { LOCALES } from "@/lib/config/constants";
import { readFileSync } from "fs";
import type { Locale } from "next-intl";
import { join } from "path";
import { createTranslator } from "use-intl/core";

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
    if (locale !== LOCALES[0]) {
      const en = getTranslator(LOCALES[0]);
      return en(key as never);
    }
    return key;
  }
}

export function parseLocale(raw: string | undefined): Locale {
  if (LOCALES.includes(raw as Locale)) return raw as Locale;
  return LOCALES[0];
}
