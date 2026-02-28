import { DE, US } from "country-flag-icons/react/3x2";
import type { Locale, useTranslations } from "next-intl";
import type { FunctionComponent, SVGAttributes } from "react";

export const LOCALES = ["en", "de"] as const;

export type FlagComponent = FunctionComponent<SVGAttributes<SVGElement>>;

export const LANGUAGES: {
  code: Uppercase<Locale>;
  Flag: FlagComponent;
}[] = [
  { code: "EN", Flag: US },
  { code: "DE", Flag: DE },
];

export const SERVER_URL_KEY = "x-url";

export type TranslationKey = Parameters<
  ReturnType<typeof useTranslations<never>>
>[0];

export const msg = <T extends TranslationKey>(key: T): T => key;
