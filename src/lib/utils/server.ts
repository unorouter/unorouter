import { redirect } from "@/i18n/navigation";
import type { Redirect } from "@/i18n/routing";
import { serverEnv } from "@/server/env";
import { getCookie } from "cookies-next/server";
import { sealData, unsealData } from "iron-session";
import { hasLocale, type Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  AUTH_REDIRECT_COOKIE,
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

// Reads a JSON store cookie server-side so the atom can be seeded before the
// first render. Undefined for a missing or malformed cookie, which seeds the
// atom's own initial value.
export const getCookieValue = async <T>(
  key: string,
): Promise<T | undefined> => {
  const cookieStore = await cookies();
  try {
    return JSON.parse(cookieStore.get(key)?.value ?? "") as T;
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

// Two separate jobs, both needed, on a cookie the client writes:
//
// 1. SAFETY. Attacker-settable, so it can carry an open redirect. "//evil.com"
//    is protocol-relative (browsers read it as https://evil.com) yet passes a
//    naive startsWith("/") check, and "/\\evil.com" passes both string checks
//    but parses as a host. Reject rather than rewrite: a silently-normalized
//    "//evil.com/steal" becomes a valid-looking "/steal" and hides the attempt.
// 2. ENCODING. Localized pathnames are real UTF-8 (/ru/модели), and a Location
//    header takes BYTES: setting one raw throws "Cannot convert argument to a
//    ByteString ... greater than 255". Parsing percent-encodes it.
//
// The localhost base is a parser seed only; nothing from it survives, since the
// return value is rebuilt from path parts alone.
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

// Mirror of redirectToLogin for an ALREADY authenticated visitor: sends them
// back where they were headed before the login wall, else the dashboard. The
// cookie is client-written and attacker-settable, hence sanitizeRedirectPath.
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
