import { msg, UID_ALPHABET } from "../config/constants";
import type {
  ExcludeVoid,
  ExtractData,
  UnwrapApiResponse,
} from "../types/eden";

export function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function rec(v: unknown): Record<string, unknown> | undefined {
  return isRecord(v) ? v : undefined;
}

export function recArr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.filter(isRecord) : [];
}

export function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

export function safeJsonParse<T = Record<string, unknown>>(
  raw: string | undefined | null,
  fallback: T,
): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function parseStringMap(
  raw: string | null | undefined,
): Record<string, string> {
  const v = safeJsonParse<unknown>(raw, null);
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v)) {
    out[k] = typeof val === "string" ? val : String(val);
  }
  return out;
}

export function nonEmptyArray<T>(val: T[] | unknown): T[] | null {
  return Array.isArray(val) && val.length > 0 ? val : null;
}

export function pick<T>(arr: ArrayLike<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function uid(length = 21): string {
  let id = "";
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
  const blob = getData().then((t) => new Blob([t], { type: "text/plain" }));
  // ClipboardItem consumes the promise internally, but if getData rejects the
  // browser still reports the blob promise as an UNHANDLED rejection even
  // though the caller catches the write() promise. Mark it handled in a
  // parallel branch; write() below still rejects into the caller's catch.
  blob.catch(() => {});
  return navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
}

export function modelSlug(name: string): string {
  return name.replace(/\[/g, "%5B").replace(/\]/g, "%5D").replace(/\//g, "%2F");
}

export function baseModelName(name: string): string {
  return name.endsWith(":free") ? name.slice(0, -":free".length) : name;
}

export function modelMatchesSlug(name: string, slug: string): boolean {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    decoded = slug;
  }
  return (
    name === slug ||
    name === decoded ||
    modelSlug(name) === slug ||
    modelSlug(name) === decoded
  );
}

export function vendorSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function modelHref(name: string, vendorName?: string) {
  const vendor = vendorName ? vendorSlug(vendorName) : "";
  const slug = [vendor || "unknown", modelSlug(name)];
  return { pathname: "/models/[...slug]" as const, params: { slug } };
}

export function unwrap<T extends { data: unknown }>(
  res: T,
): ExcludeVoid<NonNullable<T["data"]>> {
  if (res.data == null) throw new Error(msg("ERRORS.UNEXPECTED_RESPONSE"));
  return res.data as ExcludeVoid<NonNullable<T["data"]>>;
}

export function handleElysia<T extends { data: unknown; status: number }>(
  response: T,
): UnwrapApiResponse<ExtractData<T>> {
  if (response.status !== 200) throw response;
  const body = response.data;
  if (body && typeof body === "object" && "success" in body) {
    const envelope: {
      success?: unknown;
      data?: unknown;
      message?: unknown;
    } = body;
    if (!envelope.success) {
      throw new Error(String(envelope.message ?? msg("ERRORS.REQUEST_FAILED")));
    }
    if ("data" in envelope) {
      return envelope.data as UnwrapApiResponse<ExtractData<T>>;
    }
  }
  return body as UnwrapApiResponse<ExtractData<T>>;
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  return uint8ToBase64(new Uint8Array(buf));
}

export async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function base64ToUint8(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function uint8ToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

export function base64ToDataUri(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

export function parseDataUri(
  uri: string,
): { base64: string; mime: string } | null {
  const comma = uri.indexOf(",");
  if (!uri.startsWith("data:") || comma === -1) return null;
  const header = uri.slice(5, comma);
  if (!header.endsWith(";base64")) return null;
  return {
    base64: uri.slice(comma + 1),
    mime: header.slice(0, -";base64".length) || "application/octet-stream",
  };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function quoteIdent(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

export function csvToArray(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

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

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatJson(value: unknown): string {
  return value == null ? "" : JSON.stringify(value, null, 2);
}

export function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0") + ":" + input.length;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export const asParams = (
  v: unknown,
): Record<string, string | number> | undefined =>
  v && typeof v === "object"
    ? (v as Record<string, string | number>)
    : undefined;
