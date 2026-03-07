import { DE, US } from "country-flag-icons/react/3x2";
import type { Locale, useTranslations } from "next-intl";
import type { FunctionComponent, SVGAttributes } from "react";

export const NEW_API_USER = "New-Api-User";
export const SESSION_COOKIE = "session" as const;
export const USER_ID_COOKIE = "user-id" as const;
export const LOCALE_COOKIE = "NEXT_LOCALE" as const;

export const SERVER_URL_KEY = "x-url" as const;

export const FAR_FUTURE = 4102444800; // 2100-01-01

export const LOCALES = ["en", "de"] as const;
export const LANGUAGES: {
  code: Uppercase<Locale>;
  Flag: FunctionComponent<SVGAttributes<SVGElement>>;
  ogLocale: string;
}[] = [
  { code: "EN", Flag: US, ogLocale: "en-US" },
  { code: "DE", Flag: DE, ogLocale: "de-DE" },
];

export const ALTERNATE_LANGUAGES = LOCALES.reduce(
  (acc, loc) => {
    acc[loc] = `/${loc}`;
    return acc;
  },
  {} as Record<string, string>,
);

export type TranslationKey = Parameters<
  ReturnType<typeof useTranslations<never>>
>[0];

export const msg = <T extends TranslationKey>(key: T): T => key;
