import type { useTranslations } from "next-intl";

export const LOCALES = ["en", "de"] as const;

export const SERVER_URL_KEY = "x-url";

export type TranslationKey = Parameters<
  ReturnType<typeof useTranslations<never>>
>[0];

export const msg = <T extends TranslationKey>(key: T): T => key;
