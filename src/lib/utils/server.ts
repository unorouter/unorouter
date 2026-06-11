import { redirect } from "@/i18n/navigation";
import { env } from "@/lib/config/env";
import { serverEnv } from "@/server/env";
import { sealData, unsealData } from "iron-session";
import type { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  AUTH_REDIRECT_QUERY,
  GUEST_USER_ID,
  LOCALE_COOKIE,
  LOCALES,
  msg,
  SERVER_URL_KEY,
  USER_ID_COOKIE,
} from "../config/constants";
import { rpc } from "../rpc";
import { handleElysia } from "./base";

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
}) =>
  ((await safe(async () => (await props?.params)?.locale)) ||
    (await safe(getLocale)) ||
    (await safe(async () => (await cookies()).get(LOCALE_COOKIE)?.value)) ||
    LOCALES[0]) as Locale;

// Server components ONLY.
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

// Authoritative local-DB owner from the sealed user-id cookie; GUEST_USER_ID
// when absent/invalid. Server components ONLY. Injected into the client tree so
// the local DB owner is correct on first paint (no auth-query race). Defined
// here (not in config/constants) to avoid pulling iron-session into clients.
export const getResolvedUserId = async (): Promise<number> => {
  const sealed = (await cookies()).get(USER_ID_COOKIE)?.value;
  return (await verifyUserId(sealed)) ?? GUEST_USER_ID;
};

export const getDocsApiKey = async (placeholder = "YOUR_API_KEY") => {
  const data = handleElysia(await rpc.api.models.pricing.get());
  const rawModels = data.models ?? [];
  const models = rawModels.map((m) => ({
    name: m.name,
    vendor: m.vendor.name,
    type: m.type,
    outputPrice: m.isFixedPrice ? m.fixedPrice : m.outputPrice,
  }));

  const modelFor = (vendor: string) =>
    models.find((m) => m.vendor.toLowerCase() === vendor.toLowerCase())!.name;

  // Aspirational default for docs Quick Config: highest-output-price text.
  const topTextModel = models
    .filter((m) => m.type === "text" && typeof m.outputPrice === "number")
    .reduce<
      (typeof models)[number] | null
    >((best, m) => (!best || (m.outputPrice ?? 0) > (best.outputPrice ?? 0) ? m : best), null);

  return {
    apiUrl: env.apiUrl,
    placeholder,
    modelFor,
    topTextModel: topTextModel?.name ?? models[0]?.name ?? "model-name",
  };
};

export const setCookies = async () => {
  const cookie = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return { headers: { cookie } };
};

export async function fetchConvTitle(convId: string): Promise<string | null> {
  const loggedIn = (await cookies()).has(USER_ID_COOKIE);
  if (!loggedIn) return null;
  try {
    const cookieHeaders = await setCookies();
    const meta = handleElysia(
      await rpc.api.ai.chat({ id: convId }).meta.get(cookieHeaders),
    );
    return meta.title ?? null;
  } catch {
    return null;
  }
}

export function assertFound<T>(
  rows: ArrayLike<T>,
): asserts rows is { 0: T } & ArrayLike<T> {
  if (rows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
}

// Redirect unauthed to /login preserving the target path: SERVER_URL_KEY header
// (proxy.ts) -> AuthRedirectCapture -> AUTH_REDIRECT_COOKIE -> consumed by
// login-form + the OAuth callback on success.
export async function redirectToLogin(): Promise<never> {
  const locale = await serverLocale();
  const incoming = (await headers()).get(SERVER_URL_KEY);
  let target = "";
  if (incoming) {
    try {
      const u = new URL(incoming);
      // Store locale-less: i18n useRouter re-prepends the locale on push, so
      // "/en/settings" would round-trip as "/en/en/settings" (404).
      const prefix = `/${locale}`;
      let pathname = u.pathname;
      if (pathname === prefix) pathname = "/";
      else if (pathname.startsWith(`${prefix}/`))
        pathname = pathname.slice(prefix.length);
      target = pathname + (u.search || "");
    } catch {
      target = "";
    }
  }
  redirect({
    href: target
      ? { pathname: "/login", query: { [AUTH_REDIRECT_QUERY]: target } }
      : "/login",
    locale,
  });
  // redirect() throws internally; this line is unreachable.
  throw new Error("unreachable");
}
