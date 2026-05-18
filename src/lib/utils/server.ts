import { env } from "@/lib/config/env";
import type { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies, headers } from "next/headers";
import {
  GUEST_CONVS_COOKIE,
  LOCALE_COOKIE,
  LOCALES,
  msg,
  SERVER_URL_KEY,
} from "../config/constants";
import { rpc } from "../rpc";
import { handleElysia } from "./base";

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
  const data = handleElysia(await rpc.api.pricing.get());
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
      await rpc.api.chat({ id: convId }).meta.get(cookieHeaders),
    );
    return meta.title ?? null;
  } catch {
    return null;
  }
}

export async function getServerGuestConvIds(): Promise<string[]> {
  return (await getCookieValue<string[]>(GUEST_CONVS_COOKIE)) ?? [];
}

export function assertFound<T>(
  rows: ArrayLike<T>,
): asserts rows is { 0: T } & ArrayLike<T> {
  if (rows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
}

