import type { UnwrapApiResponse } from "../types";

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  }
  return fallbackCopy(text);
}

function fallbackCopy(text: string): Promise<void> {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return Promise.resolve();
}

export function formatPrice(price: number): string {
  if (price === 0) return "$0.00";
  if (price >= 0.01) return `$${price.toFixed(2)}`;
  const str = price.toFixed(4);
  return `$${str.replace(/0+$/, "")}`;
}

/**
 * Extract the data field from an Eden treaty response, distributing over unions.
 * Eden returns { data: T; status: number } where T can be a union
 * (e.g. ResponseDto | void for error branches).
 */
type ExtractData<T> = T extends { data: infer D } ? NonNullable<D> : never;

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
    throw new Error((body as { message?: string }).message ?? "Request failed");
  }
  if (body && typeof body === "object" && "success" in body && "data" in body) {
    return (body as { data: unknown }).data as UnwrapApiResponse<
      ExtractData<T>
    >;
  }
  return body as UnwrapApiResponse<ExtractData<T>>;
}
