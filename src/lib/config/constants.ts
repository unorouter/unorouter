import { DE, US } from "country-flag-icons/react/3x2";
import type { Locale, useTranslations } from "next-intl";
import type { FunctionComponent, SVGAttributes } from "react";
import { env } from "./env";

export const IS_DEV = process.env.NODE_ENV === "development";

export const NEW_API_USER = "New-Api-User";
export const SESSION_COOKIE = "session" as const;
export const ACCESS_TOKEN_COOKIE = "access_token" as const;
export const USER_ID_COOKIE = "user-id" as const;
export const LOCALE_COOKIE = "NEXT_LOCALE" as const;
export const AUTH_REDIRECT_COOKIE = "auth_redirect" as const;
export const AFF_CODE_KEY = "aff" as const;
export function affLink(code?: string) {
  return code ? `${env.appUrl}/?${AFF_CODE_KEY}=${code}` : env.appUrl;
}
export const GUEST_CONVS_COOKIE = "guest-convs" as const;

export const SERVER_URL_KEY = "x-url" as const;

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export const FAR_FUTURE = 4102444800; // 2100-01-01

export const PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

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
  appName: env.appName,
  appDomain: new URL(env.appUrl).hostname.replace(/^www\./, ""),
  supportEmail: env.supportEmail,
};

export const DOCS_TOKEN_PARAMS = { p: 1, page_size: 100 } as const;

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
