import {
  AE,
  BR,
  CN,
  DE,
  ES,
  FR,
  ID,
  IL,
  IN,
  IT,
  JP,
  KR,
  PL,
  RU,
  TR,
  TW,
  US,
  VN,
} from "country-flag-icons/react/3x2";
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
export const POSTHOG_DISABLED =
  process.env.NEXT_PUBLIC_POSTHOG_DISABLED === "true";

export const PUBLIC_CACHE = { next: { revalidate: 3600 } } as const;

export const THIRTY_DAY_CACHE = {
  next: { revalidate: 60 * 60 * 24 * 30 },
} as const;

export const NEW_API_USER = "New-Api-User";
export const ACCESS_TOKEN_COOKIE = "access_token" as const;
export const USER_ID_COOKIE = "user-id" as const;
// Unsealed twin of USER_ID_COOKIE for client-side local-DB scoping (no
// server trust; see localUserIdAtom).
export const LOCAL_USER_ID_COOKIE = "local-user-id" as const;
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

export const GUEST_USER_ID = 0;

export const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const LOCALES = [
  "en",
  "de",
  "fr",
  "it",
  "es",
  "pt-BR",
  "ja",
  "ko",
  "ru",
  "tr",
  "ar",
  "he",
  "hi",
  "id",
  "pl",
  "vi",
  "zh-CN",
  "zh-TW",
] as const;

export const NATIVE_VERSION = `${env.appName.toLowerCase()}.1.0` as const;
export const ORPG_EXTENSION_KEY = `_${env.appName.toLowerCase()}_extension`;
export const ORPG_VERSION = "orpg.3.0";

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
  { code: "IT", locale: "it", Flag: IT, ogLocale: "it-IT" },
  { code: "ES", locale: "es", Flag: ES, ogLocale: "es-ES" },
  { code: "PT_BR", locale: "pt-BR", Flag: BR, ogLocale: "pt-BR" },
  { code: "JA", locale: "ja", Flag: JP, ogLocale: "ja-JP" },
  { code: "KO", locale: "ko", Flag: KR, ogLocale: "ko-KR" },
  { code: "RU", locale: "ru", Flag: RU, ogLocale: "ru-RU" },
  { code: "TR", locale: "tr", Flag: TR, ogLocale: "tr-TR" },
  { code: "AR", locale: "ar", Flag: AE, ogLocale: "ar-AE" },
  { code: "HE", locale: "he", Flag: IL, ogLocale: "he-IL" },
  { code: "HI", locale: "hi", Flag: IN, ogLocale: "hi-IN" },
  { code: "ID", locale: "id", Flag: ID, ogLocale: "id-ID" },
  { code: "PL", locale: "pl", Flag: PL, ogLocale: "pl-PL" },
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

export const NONE_VALUE = "__none__";

export const UID_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const IMAGE_MAX_DIM = 2048;

export const FREE_MODEL_OUTPUT_CAP = 8192;

export const UNKNOWN_MODEL_OUTPUT_CAP = 4096;

export const CONTEXT_SAFETY_MARGIN = 2048;

export const DEFAULT_CHAT_MEMORY = 200;

export const DEFAULT_AUTHOR_NOTE_DEPTH = 4;

export const TAVILY_TIMEOUT_MS = 5_000;

export const MODERATION_TIMEOUT_MS = 5_000;

export const MAX_RECURSIVE_LOREBOOK_PASSES = 3;

export const TITLE_SYSTEM_PROMPT = `Generate a concise title (max 8 words) for this conversation based on the user's message.
The title MUST be in the same language as the user's message.
Return only the title text, no quotes or formatting.`;

export const TITLE_MODELS = [
  "gpt-oss-120b:free",
  "gpt-oss-20b:free",
  "llama-3.3-70b:free",
] as const;

export const TITLE_FALLBACK_MAX_CHARS = 60;

export const WEB_SEARCH_CLASSIFIER_SYSTEM_PROMPT = `Decide if this query needs current or real-time web information to answer accurately. Reply only "yes" or "no".`;
