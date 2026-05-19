import { CN, DE, FR, JP, RU, TW, US, VN } from "country-flag-icons/react/3x2";
import type { Locale } from "next-intl";
import type { FunctionComponent, SVGAttributes } from "react";
import type { DashToUnderscore, TranslationKey } from "../types";
import { env } from "./env";
export { ParamError } from "../types";
export type { TranslationKey } from "../types";
export {
  dollarsToQuota,
  QUOTA_PER_DOLLAR,
  quotaToDollars,
  renderQuota,
} from "../utils/format/number";

export const IS_DEV = process.env.NODE_ENV === "development";

export const NEW_API_USER = "New-Api-User";
export const ACCESS_TOKEN_COOKIE = "access_token" as const;
export const USER_ID_COOKIE = "user-id" as const;
export const LOCALE_COOKIE = "NEXT_LOCALE" as const;
export const AUTH_REDIRECT_COOKIE = "auth_redirect" as const;
export const AUTH_REDIRECT_QUERY = "redirect" as const;

export const RESEND_COOLDOWN_SECONDS = 60;
export const AFF_CODE_KEY = "aff" as const;
export function affLink(code?: string) {
  return code ? `${env.appUrl}/?${AFF_CODE_KEY}=${code}` : env.appUrl;
}

export const SERVER_URL_KEY = "x-url" as const;

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30d

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

type LocaleCode = Uppercase<DashToUnderscore<(typeof LOCALES)[number]>>;

export const LANGUAGES: {
  code: LocaleCode;
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

export const msg = <T extends TranslationKey>(key: T): T => key;

export const APP_VALUES = {
  appName: env.appName,
  appDomain: new URL(env.appUrl).hostname.replace(/^www\./, ""),
  supportEmail: env.supportEmail,
};

// Free-tier maxOutputTokens metadata is often inflated past what upstream
// serves (gemma claims 131072 but channel allows 32768). Clamp to avoid 400s.
export const FREE_MODEL_OUTPUT_CAP = 8192;

// Free models are flaky; race N parallel calls for short aux requests.
export const FREE_MODEL_RACE_COUNT = 5;

export const TAVILY_TIMEOUT_MS = 5_000;

export const MODERATION_TIMEOUT_MS = 5_000;

export const PENDING_USAGE_TTL_MS = 5 * 60 * 1000;

export const TITLE_SYSTEM_PROMPT = `Generate a concise title (max 8 words) for this conversation based on the user's message.
The title MUST be in the same language as the user's message.
Return only the title text, no quotes or formatting.`;

export const WEB_SEARCH_CLASSIFIER_SYSTEM_PROMPT = `Decide if this query needs current or real-time web information to answer accurately. Reply only "yes" or "no".`;
