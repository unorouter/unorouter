import { msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import type {
  ExcludeVoid,
  ExtractData,
  UnwrapApiResponse,
} from "../types/eden";

export function safeJsonParse<T = Record<string, unknown>>(
  raw: string | undefined | null,
  fallback: T,
): T {
  if (!raw) return fallback;
  try {
    // SAFETY: caller provides typed fallback; parse failure is caught
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

/**
 * Deterministic hue (0-360) for a given string. djb2-style hash so similar
 * names (e.g. gpt-5.4 / gpt-5.4-mini) get noticeably different hues. Use this
 * to keep per-model colors stable across charts, log badges, reloads.
 */
export function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % 360;
}

/** Solid HSL color for a model name. Use for chart fills, lines, bars. */
export function modelColor(name: string): string {
  return `hsl(${nameToHue(name)} 70% 50%)`;
}

/** Badge style for a model name: tinted background + readable text color. */
export function modelColorStyle(name: string): {
  backgroundColor: string;
  color: string;
} {
  const hue = nameToHue(name);
  return {
    backgroundColor: `hsl(${hue} 85% 50% / 0.15)`,
    color: `hsl(${hue} 70% 40%)`,
  };
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
  if (res.data == null) throw new Error(msg("ERRORS.UNEXPECTED_RESPONSE"));
  // SAFETY: null-checked above; cast needed for generic return type
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
  if (body && typeof body === "object" && "success" in body) {
    const envelope = body as {
      success: boolean;
      data?: unknown;
      message?: string;
    };
    if (!envelope.success) {
      throw new Error(envelope.message ?? msg("ERRORS.REQUEST_FAILED"));
    }
    if ("data" in envelope) {
      // SAFETY: generic return type cannot be inferred from runtime checks
      return envelope.data as UnwrapApiResponse<ExtractData<T>>;
    }
  }
  // SAFETY: generic return type cannot be inferred from runtime checks
  return body as UnwrapApiResponse<ExtractData<T>>;
}
