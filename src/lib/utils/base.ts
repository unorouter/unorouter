import { msg, UID_ALPHABET } from "@/lib/config/constants";
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

    // Parse a JSON object string into a string map (chat/global var stores). Non-object/array/invalid input -> {}; non-string values are stringified.
export function parseStringMap(
  raw: string | null | undefined,
): Record<string, string> {
  const v = safeJsonParse<unknown>(raw, null);
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    out[k] = typeof val === "string" ? val : String(val);
  }
  return out;
}

export function pick<T>(arr: ArrayLike<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function uid(length = 21): string {
  let id = "";
  // Rejection sampling: bytes >=62 discarded for uniform alphanumeric output.
  while (id.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    for (let i = 0; i < length && id.length < length; i++) {
      const slot = bytes[i] & 63;
      if (slot < 62) id += UID_ALPHABET[slot];
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

    // next-intl rejects raw [ ] and a raw / splits into extra route segments; encode all three into a single URL-safe segment. Pair with modelMatchesSlug for the inverse.
export function modelSlug(name: string): string {
  return name.replace(/\[/g, "%5B").replace(/\]/g, "%5D").replace(/\//g, "%2F");
}

    // params.slug arrives URL-decoded by Next, so a name with a raw / never round-trips as one segment. Compare against the encoded form too, and tolerate the legacy raw-name match.
export function modelMatchesSlug(name: string, slug: string): boolean {
  return name === slug || modelSlug(name) === slug;
}

export function unwrap<T extends { data: unknown }>(
  res: T,
): ExcludeVoid<NonNullable<T["data"]>> {
  if (res.data == null) throw new Error(msg("ERRORS.UNEXPECTED_RESPONSE"));
  return res.data as ExcludeVoid<NonNullable<T["data"]>>;
}

// Throws on non-200/{success:false}; unwraps {data}.
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

export function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Uint8Array<ArrayBufferLike> -> fresh ArrayBuffer-backed copy for Blob parts.
export function uint8ToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

export function base64ToDataUri(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
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

    // Splits a comma-separated form field into a trimmed, empty-stripped array. RP forms edit keys/tags/triggers as one text input; the DB stores arrays.
export function csvToArray(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Filename-safe slug; non-alphanumerics->-, cap 60 chars.
export function exportSlug(name: string, fallback: string): string {
  return name.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || fallback;
}

export function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function unixSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatJson(value: unknown): string {
  return value == null ? "" : JSON.stringify(value, null, 2);
}

    // FNV-1a 32-bit over a string, hex-encoded. Stable, fast, non-cryptographic: a content fingerprint (chat-context dedup), not security.
export function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0") + ":" + input.length;
}

// Coerce an unknown value to an i18n params record, or undefined.
export const asParams = (
  v: unknown,
): Record<string, string | number> | undefined =>
  v && typeof v === "object"
    ? (v as Record<string, string | number>)
    : undefined;
