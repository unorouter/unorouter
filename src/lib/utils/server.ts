import { redirect } from "@/i18n/navigation";
import type { Redirect } from "@/i18n/routing";
import { getCookie } from "cookies-next/server";
import { hasLocale, type Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  AUTH_REDIRECT_COOKIE,
  AUTH_REDIRECT_QUERY,
  LOCALE_COOKIE,
  LOCALES,
  SERVER_URL_KEY,
} from "../config/constants";

export const setCookies = async () => {
  const cookie = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return { headers: { cookie } };
};

const safe = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
  try {
    return await fn();
  } catch {
    return undefined;
  }
};

export const getCookieValue = async <T>(
  key: string,
): Promise<T | undefined> => {
  const cookieStore = await cookies();
  try {
    return JSON.parse(cookieStore.get(key)?.value ?? "");
  } catch {
    return undefined;
  }
};

export const serverLocale = async (props?: {
  params: Promise<{ locale: string }>;
}): Promise<Locale> => {
  const fromParams = await safe(async () => (await props?.params)?.locale);
  if (fromParams && hasLocale(LOCALES, fromParams)) return fromParams;
  const candidate =
    (await safe(getLocale)) ||
    (await safe(async () => (await cookies()).get(LOCALE_COOKIE)?.value));
  return candidate && hasLocale(LOCALES, candidate) ? candidate : LOCALES[0];
};

// Attacker-settable cookie: "//evil.com" and "/\evil.com" are open redirects that
// pass a naive startsWith("/"). Reparsing also encodes UTF-8 pathnames (/ru/модели),
// which a Location header rejects raw as "Cannot convert argument to a ByteString".
export function sanitizeRedirectPath(target: string): string | null {
  if (!target.startsWith("/") || target.startsWith("//")) return null;
  try {
    const url = new URL(target, "http://localhost");
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
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

export async function redirectFromAuth(): Promise<never> {
  const locale = await serverLocale();
  const stored = String(
    (await getCookie(AUTH_REDIRECT_COOKIE, { cookies })) ?? "",
  );
  const target = sanitizeRedirectPath(stored) as Redirect["href"] | null;
  return redirect({ href: target || "/dashboard", locale });
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
