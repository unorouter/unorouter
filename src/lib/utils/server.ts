import type { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE_KEY, LOCALES } from "../config/constants";

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
    (await safe(async () => (await cookies()).get(LOCALE_COOKIE_KEY)?.value)) ||
    LOCALES[0]) as Locale;

/**
 * get cookie from nextjs header for RPC calls in server components ONLY.
 * @returns An object containing the cookie header for authentication.
 */
export const setCookies = async () => {
  const cookie = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return { headers: { cookie } };
};
