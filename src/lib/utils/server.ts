import {
  DOCS_STORE_KEY,
  obfuscateApiKey,
  type DocsState,
} from "@/store/docs-store";
import type { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALES } from "../config/constants";

const safe = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await fn();
  } catch {
    return undefined;
  }
};

export const serverLocale = async (props?: {
  params: Promise<{ locale: string }>;
}) =>
  ((await safe(async () => (await props?.params)?.locale)) ||
    (await safe(getLocale)) ||
    (await safe(async () => (await cookies()).get(LOCALE_COOKIE)?.value)) ||
    LOCALES[0]) as Locale;

/**
 * get cookie from nextjs header for RPC calls in server components ONLY.
 * @returns An object containing the cookie header for authentication.
 */
export const getCookieValue = async <T>(key: string): Promise<T | undefined> => {
  const cookieStore = await cookies();
  try {
    return JSON.parse(cookieStore.get(key)?.value ?? "");
  } catch {
    return undefined;
  }
};

/** Server-side utility to read api key display info from cookie */
export const getDocsApiKey = async (placeholder = "your-api-key-here") => {
  const state = await getCookieValue<DocsState>(DOCS_STORE_KEY);
  const rawApiKey = state?.apiKey ?? null;
  const isRevealed = state?.apiKeyRevealed ?? false;
  const displayKey = rawApiKey
    ? isRevealed
      ? rawApiKey
      : obfuscateApiKey(rawApiKey)
    : placeholder;
  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL!,
    rawApiKey,
    isRevealed,
    displayKey,
    placeholder,
  };
};

export const setCookies = async () => {
  const cookie = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return { headers: { cookie } };
};
