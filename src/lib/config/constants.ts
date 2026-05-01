import { CN, DE, FR, JP, RU, TW, US, VN } from "country-flag-icons/react/3x2";
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
export const GUEST_CONVS_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, matches R2 TTL

export const FAR_FUTURE = 4102444800; // 2100-01-01

export const PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const LOCALES = [
  "en",
  "de",
  "fr",
  "ja",
  "ru",
  "vi",
  "zh-CN",
  "zh-TW",
] as const;
export const LANGUAGES: {
  code: "EN" | "DE" | "FR" | "JA" | "RU" | "VI" | "ZH_CN" | "ZH_TW";
  locale: Locale;
  Flag: FunctionComponent<SVGAttributes<SVGElement>>;
  ogLocale: string;
}[] = [
  { code: "EN", locale: "en", Flag: US, ogLocale: "en-US" },
  { code: "DE", locale: "de", Flag: DE, ogLocale: "de-DE" },
  { code: "FR", locale: "fr", Flag: FR, ogLocale: "fr-FR" },
  { code: "JA", locale: "ja", Flag: JP, ogLocale: "ja-JP" },
  { code: "RU", locale: "ru", Flag: RU, ogLocale: "ru-RU" },
  { code: "VI", locale: "vi", Flag: VN, ogLocale: "vi-VN" },
  { code: "ZH_CN", locale: "zh-CN", Flag: CN, ogLocale: "zh-CN" },
  { code: "ZH_TW", locale: "zh-TW", Flag: TW, ogLocale: "zh-TW" },
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

// ---------------------------------------------------------------------------
// Chat / streaming knobs
// ---------------------------------------------------------------------------

/** Hard cap on output tokens for free-tier models. Their declared
 *  maxOutputTokens metadata is often inflated past what the upstream actually
 *  serves (e.g. gemma claims 131072 but the channel only allows 32768 total
 *  context), so we clamp to a safe budget to avoid context-length 400s. */
export const FREE_MODEL_OUTPUT_CAP = 8192;

/** Number of free models to race in parallel for short auxiliary calls
 *  (title generation, web-search classifier). Free models are flaky so we
 *  fan out and take whichever responds first. */
export const FREE_MODEL_RACE_COUNT = 5;

/** Timeout for the Tavily web-search request and its yes/no classifier. */
export const TAVILY_TIMEOUT_MS = 5_000;

/** Timeout for the moderation pre-check on user prompts. */
export const MODERATION_TIMEOUT_MS = 5_000;

/** Sentinel user id used in moderation logs when the caller is unauthenticated. */
export const GUEST_USER_ID = -1;

/** Pending-usage entries are dropped after this many ms without a write. */
export const PENDING_USAGE_TTL_MS = 5 * 60 * 1000;

/** System prompt for the conversation-title generator. */
export const TITLE_SYSTEM_PROMPT = `Generate a concise title (max 8 words) for this conversation based on the user's message.
The title MUST be in the same language as the user's message.
Return only the title text, no quotes or formatting.`;

/** System prompt for the web-search yes/no classifier. */
export const WEB_SEARCH_CLASSIFIER_SYSTEM_PROMPT = `Decide if this query needs current or real-time web information to answer accurately. Reply only "yes" or "no".`;
