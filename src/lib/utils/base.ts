import { msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import type { ReactNode } from "react";
import type {
  ExcludeVoid,
  ExtractData,
  UnwrapApiResponse,
} from "../types/eden";

// Re-export focused helpers so existing `import ... from "@/lib/utils/base"`
// consumers keep working without churn.
export {
  formatLatency,
  formatPct,
  formatPrice,
  formatShare,
  formatTokenCount,
  formatTokens,
  formatTps,
} from "./format/number";
export { modelColor, modelColorStyle, nameToHue } from "./format/color";
export { avg, successIntent, type StatIntent } from "./format/math";

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

/** Encode a model name for safe use as a URL slug. next-intl's pathname
 * matcher rejects raw `[`/`]` in param values because they collide w/ the
 * `[slug]` template syntax. Models like `claude-haiku-4-5-20251001[1m]`
 * need their brackets URL-encoded. */
export function modelSlug(name: string): string {
  return name.replace(/\[/g, "%5B").replace(/\]/g, "%5D");
}

export type LabeledRow = { label: string; value: ReactNode };

/** Build a `{ label, value }` row when `condition` is truthy; otherwise null. */
export function row(
  condition: unknown,
  label: string,
  value: ReactNode,
): LabeledRow | null {
  return condition ? { label, value } : null;
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
 * - Unwraps { success: true, data: D } -> D
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
