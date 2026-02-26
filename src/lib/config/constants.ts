export const LOCALES = ["en", "de"] as const;

export const SERVER_URL_KEY = "x-url";

export type TranslationKey = Parameters<
  ReturnType<typeof useTranslations<never>>
>[0];
