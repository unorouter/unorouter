import { DE, US } from "country-flag-icons/react/3x2";
import type { Locale, useTranslations } from "next-intl";
import type { FunctionComponent, SVGAttributes } from "react";

export const LOCALES = ["en", "de"] as const;
export const AUTH_COOKIE = "auth" as const;
export const SERVER_URL_KEY = "x-url";

export const LANGUAGES: {
  code: Uppercase<Locale>;
  Flag: FunctionComponent<SVGAttributes<SVGElement>>;
  ogLocale: string;
}[] = [
  { code: "EN", Flag: US, ogLocale: "en-US" },
  { code: "DE", Flag: DE, ogLocale: "de-DE" },
];

export type TranslationKey = Parameters<
  ReturnType<typeof useTranslations<never>>
>[0];

export const msg = <T extends TranslationKey>(key: T): T => key;
