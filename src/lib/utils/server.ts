import type { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, LOCALES } from "../config/constants";
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

/**
 * get cookie from nextjs header for RPC calls in server components ONLY.
 * @returns An object containing the cookie header for authentication.
 */
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

/** Server-side utility for docs code block placeholders and model names */
export const getDocsApiKey = async (placeholder = "YOUR_API_KEY") => {
  const data = handleElysia(await rpc.api.pricing.get());
  const models = (data.models ?? []).map((m) => ({
    name: m.name,
    vendor: m.vendor.name,
  }));

  const modelFor = (vendor: string) =>
    models.find((m) => m.vendor.toLowerCase() === vendor.toLowerCase())!.name;

  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL!,
    placeholder,
    modelFor,
  };
};

export const setCookies = async () => {
  const cookie = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return { headers: { cookie } };
};
