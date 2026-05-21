import { msg } from "@/lib/config/constants";
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
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function uid(length = 21): string {
  let id = "";
  // Rejection sampling: a 6-bit value maps to 64 slots but the alphabet has
  // 62, so bytes >= 62 are discarded to keep the distribution uniform and the
  // output strictly alphanumeric (no leading `-` in URL slugs).
  while (id.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    for (let i = 0; i < length && id.length < length; i++) {
      const slot = bytes[i] & 63;
      if (slot < 62) id += ALPHABET[slot];
    }
  }
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

// next-intl's pathname matcher rejects raw `[`/`]` (collides with `[slug]`).
// Models like `claude-haiku-4-5-20251001[1m]` need brackets encoded.
export function modelSlug(name: string): string {
  return name.replace(/\[/g, "%5B").replace(/\]/g, "%5D");
}

export function unwrap<T extends { data: unknown }>(
  res: T,
): ExcludeVoid<NonNullable<T["data"]>> {
  if (res.data == null) throw new Error(msg("ERRORS.UNEXPECTED_RESPONSE"));
  return res.data as ExcludeVoid<NonNullable<T["data"]>>;
}

// Throws on non-200 or {success:false}; unwraps {success:true, data}; else
// returns body.
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
      return envelope.data as UnwrapApiResponse<ExtractData<T>>;
    }
  }
  return body as UnwrapApiResponse<ExtractData<T>>;
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Reads a File as raw base64, stripping the `data:<mime>;base64,` prefix.
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// SQL identifier quoting (table/column names). Escapes embedded `"`.
export function quoteIdent(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}
