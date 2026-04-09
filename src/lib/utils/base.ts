import { env } from "@/lib/config/env";
import { msg } from "@/lib/config/constants";
import type { ExcludeVoid, ExtractData, UnwrapApiResponse } from "../types/eden";

export function devWarn(context: string, error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[${context}]`, error);
  }
}

export function safeJsonParse<T = Record<string, any>>(
  raw: string | undefined | null,
  fallback?: T,
): T {
  if (!fallback) fallback = {} as T;
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

export function uid(length = 21): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let id = "";
  for (let i = 0; i < length; i++) id += ALPHABET[bytes[i] & 63];
  return id;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function shareUrl(shareId: string): string {
  return `${env.appUrl}/shared/${shareId}`;
}

export function copyToClipboardAsync(
  getData: () => Promise<string>,
): Promise<void> {
  return navigator.clipboard.write([
    new ClipboardItem({
      "text/plain": getData().then(
        (t) => new Blob([t], { type: "text/plain" }),
      ),
    }),
  ]);
}

export function formatPrice(price: number): string {
  if (price === 0) return "$0.00";
  if (price >= 0.01) return `$${price.toFixed(2)}`;
  if (price >= 0.0001) return `$${price.toFixed(4).replace(/0+$/, "")}`;
  // Very small values: show first 2 significant digits
  const exp = Math.floor(Math.log10(price));
  const decimals = Math.min(-exp + 1, 10);
  return `$${price.toFixed(decimals)}`;
}

/** Safely unwrap an Orval-generated API response, throwing if data is null. */
export function unwrap<T extends { data: unknown }>(
  res: T,
): ExcludeVoid<NonNullable<T["data"]>> {
  if (res.data == null)
    throw new Error(msg("ERRORS.UNEXPECTED_RESPONSE"));
  return res.data as ExcludeVoid<NonNullable<T["data"]>>;
}

/**
 * Handles an Elysia/Eden treaty response:
 * - Throws on non-200 status
 * - Throws on { success: false } responses
 * - Unwraps { success: true, data: D } → D
 * - Returns direct data as-is
 */
export function handleElysia<T extends { data: unknown; status: number }>(
  response: T,
): UnwrapApiResponse<ExtractData<T>> {
  if (response.status !== 200) throw response;
  const body = response.data;
  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    !(body as { success: boolean }).success
  ) {
    throw new Error(
      (body as { message?: string }).message ?? msg("ERRORS.REQUEST_FAILED"),
    );
  }
  if (body && typeof body === "object" && "success" in body && "data" in body) {
    return (body as { data: unknown }).data as UnwrapApiResponse<
      ExtractData<T>
    >;
  }
  return body as UnwrapApiResponse<ExtractData<T>>;
}
