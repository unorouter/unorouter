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

export const APP_VALUES = {
  appName: process.env.NEXT_PUBLIC_APP_NAME!,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL!,
};

/** 1 USD = 500000 quota units in new-api */
export const QUOTA_PER_DOLLAR = 500000;

export function quotaToDollars(quota: number): number {
  return quota / QUOTA_PER_DOLLAR;
}

export function dollarsToQuota(dollars: number): number {
  return Math.round(dollars * QUOTA_PER_DOLLAR);
}

export function renderQuota(quota: number | undefined, decimals = 2): string {
  if (quota === undefined || quota === null) return "$0.00";
  return `$${quotaToDollars(quota).toFixed(decimals)}`;
}

export function getGreetingKey(): TranslationKey {
  const hours = new Date().getHours();
  if (hours >= 5 && hours < 12) return "DASHBOARD.GREETING_MORNING";
  if (hours >= 12 && hours < 18) return "DASHBOARD.GREETING_AFTERNOON";
  return "DASHBOARD.GREETING_EVENING";
}
