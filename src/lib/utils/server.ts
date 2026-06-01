import { redirect } from "@/i18n/navigation";
import { env } from "@/lib/config/env";
import { serverEnv } from "@/server/env";
import { sealData, unsealData } from "iron-session";
import type { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  AUTH_REDIRECT_QUERY,
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

/**
 * Redirect an unauthed user to /login and preserve the path they were trying
 * to reach. The originating URL is read from the SERVER_URL_KEY request header
 * stamped by src/proxy.ts; on /login the existing AuthRedirectCapture stashes
 * it into AUTH_REDIRECT_COOKIE, which login-form.tsx + the OAuth callback in
 * server/auth/account/route.ts consume on success.
 */
export async function redirectToLogin(): Promise<never> {
  const locale = await serverLocale();
  const incoming = (await headers()).get(SERVER_URL_KEY);
  let target = "";
  if (incoming) {
    try {
      const u = new URL(incoming);
      target = u.pathname + (u.search || "");
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
