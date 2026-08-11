import { redirect } from "@/i18n/navigation";
import { env } from "@/lib/config/env";
import { serverEnv } from "@/server/env";
import { sealData, unsealData } from "iron-session";
import { hasLocale, type Locale } from "next-intl";
import { getLocale, setRequestLocale } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  AUTH_REDIRECT_QUERY,
  LOCALE_COOKIE,
  LOCALES,
  msg,
  SERVER_URL_KEY,
} from "../config/constants";

export const setCookies = async () => {
  const cookie = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return { headers: { cookie } };
};

export async function signUserId(userId: number | string): Promise<string> {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0)
    throw new Error(msg("ERRORS.INVALID_USER_ID"));
  return sealData({ uid: id }, { password: serverEnv.sessionSecret });
}

export async function verifyUserId(
  sealed: string | undefined,
): Promise<number | null> {
  if (!sealed) return null;
  let data: { uid?: number };
  try {
    data = await unsealData<{ uid?: number }>(sealed, {
      password: serverEnv.sessionSecret,
    });
  } catch {
    return null;
  }
  const n = Number(data?.uid);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const safe = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await fn();
  } catch {
    return undefined;
  }
};

export const serverLocale = async (props?: {
  params: Promise<{ locale: string }>;
}): Promise<Locale> => {
  const fromParams = await safe(async () => (await props?.params)?.locale);
  if (fromParams && hasLocale(LOCALES, fromParams)) {
    // Enables static rendering: next-intl otherwise reads the locale from
    // request headers, opting the whole route into dynamic rendering.
    setRequestLocale(fromParams);
    return fromParams;
  }
  return ((await safe(getLocale)) ||
    (await safe(async () => (await cookies()).get(LOCALE_COOKIE)?.value)) ||
    LOCALES[0]) as Locale;
};

// The auth-redirect cookie is client-written: it may hold a DECODED localized
// path (Cyrillic /ru/... pathnames throw "Cannot convert argument to a
// ByteString" when set raw on a Location header) and, being attacker-settable,
// could carry protocol-relative (//evil.com) or absolute-URL open redirects.
// Rebuild from URL parts so the path comes back percent-encoded and same-origin.
export function sanitizeRedirectPath(target: string): string | null {
  if (!target.startsWith("/") || target.startsWith("//")) return null;
  try {
    const url = new URL(target, "http://localhost");
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

export function assertFound<T>(
  rows: ArrayLike<T>,
): asserts rows is { 0: T } & ArrayLike<T> {
  if (rows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
}

export async function redirectToLogin(): Promise<never> {
  const locale = await serverLocale();
  const incoming = (await headers()).get(SERVER_URL_KEY);
  const target = incoming ? stripLocalePrefix(incoming, locale) : "";
  return redirect({
    href: target
      ? { pathname: "/login", query: { [AUTH_REDIRECT_QUERY]: target } }
      : "/login",
    locale,
  });
}

function stripLocalePrefix(url: string, locale: string): string {
  try {
    const u = new URL(url);
    const prefix = `/${locale}`;
    const pathname =
      u.pathname === prefix
        ? "/"
        : u.pathname.startsWith(`${prefix}/`)
          ? u.pathname.slice(prefix.length)
          : u.pathname;
    return pathname + u.search;
  } catch {
    return "";
  }
}
