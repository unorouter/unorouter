import { env } from "@/lib/config/env";
import { serverEnv } from "@/server/env";
import type { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  LOCALE_COOKIE,
  LOCALES,
  msg,
  SERVER_URL_KEY,
} from "../config/constants";
import { rpc } from "../rpc";
import { handleElysia } from "./base";

function hmac(payload: string): string {
  if (!serverEnv.sessionSecret) throw new Error("SESSION_SECRET is not set");
  return createHmac("sha256", serverEnv.sessionSecret)
    .update(payload)
    .digest("base64url");
}

export function signUserId(userId: number | string): string {
  const id = String(userId);
  return `${id}.${hmac(id)}`;
}

export function verifyUserId(signed: string | undefined): number | null {
  if (!signed) return null;
  const dot = signed.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = signed.slice(0, dot);
  const sig = signed.slice(dot + 1);
  let expected: string;
  try {
    expected = hmac(id);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const n = Number(id);
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

export const serverPathname = async (fallbackLocale: string) => {
  const reqUrl = (await headers()).get(SERVER_URL_KEY);
  return reqUrl ? new URL(reqUrl).pathname : `/${fallbackLocale}`;
};

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

