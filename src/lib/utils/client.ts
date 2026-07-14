import { IMAGE_MAX_DIM } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/config/constants";
import type { Extracted } from "@/lib/types";
import { asParams } from "@/lib/utils/base";
import {
  DefaultErrorFunction,
  SetErrorFunction,
} from "@sinclair/typebox/errors";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

SetErrorFunction((error) => {
  if (typeof error.schema.error === "string") return error.schema.error;
  return DefaultErrorFunction(error);
});

export type ErrorDetail = {
  message: string;
  code?: string;
  status?: number;
  requestId?: string;
};

const REQUEST_ID_RE = /request id:?\s*([A-Za-z0-9]+)/i;

export function extractErrorDetail(e: unknown): ErrorDetail {
  let status: number | undefined;
  let body: unknown = e;

  if (e && typeof e === "object") {
    const obj = e as Record<string, unknown>;
    if (typeof obj.statusCode === "number") status = obj.statusCode;
    if (typeof obj.responseBody === "string" && obj.responseBody.trim())
      body = obj.responseBody;
    else if ("data" in obj) body = obj.data;
    else if (e instanceof Error) body = e.message;
  }

  let parsed: unknown = body;
  if (typeof body === "string") {
    const s = body.trim();
    if (s.startsWith("{") || s.startsWith("[")) {
      try {
        parsed = JSON.parse(s);
      } catch {
        parsed = body;
      }
    }
  }

  const errObj =
    parsed && typeof parsed === "object" && "error" in parsed
      ? (parsed as { error: unknown }).error
      : parsed;
  const found = pickMessage(errObj) ?? pickMessage(body);
  const message =
    found?.message || stringifyError((e as Error)?.message ?? errObj ?? e);

  let code: string | undefined;
  if (errObj && typeof errObj === "object") {
    const c = (errObj as { code?: unknown }).code;
    if (typeof c === "string" && c) code = c;
  }

  const requestId = message.match(REQUEST_ID_RE)?.[1];
  return { message, code, status, requestId };
}

// Buckets a stream error into a coarse type for analytics (never user-facing).
export function classifyStreamError(detail: ErrorDetail): string {
  const s = detail.status;
  if (s === 429) return "rate_limit";
  if (s === 401 || s === 403) return "auth";
  if (s === 402) return "insufficient_balance";
  if (typeof s === "number" && s >= 500) return "server";
  const msg = detail.message.toLowerCase();
  if (/rate limit|too many|busy right now|providers.*busy/.test(msg))
    return "rate_limit";
  if (/invalid token|unauthor|forbidden|api key/.test(msg)) return "auth";
  if (/quota|balance|insufficient|payment/.test(msg))
    return "insufficient_balance";
  if (/not found|no such model|does not exist/.test(msg)) return "model_error";
  if (typeof s === "number" && s >= 400) return "model_error";
  if (s == null) return "network";
  return "other";
}

function pickMessage(v: unknown): Extracted | null {
  if (typeof v === "string") {
    const s = v.trim();
    if (s.startsWith("{") || s.startsWith("[")) {
      try {
        return pickMessage(JSON.parse(s));
      } catch {}
    }
    return { message: v };
  }
  if (Array.isArray(v)) {
    for (const item of v) {
      const found = pickMessage(item);
      if (found) return found;
    }
    return null;
  }
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    for (const key of ["message", "detail", "error_description"]) {
      if (typeof obj[key] === "string" && (obj[key] as string).trim()) {
        return {
          message: obj[key] as string,
          params: asParams(obj.params),
        };
      }
    }
    for (const key of ["error", "data", "body", "response"]) {
      if (key in obj) {
        const found = pickMessage(obj[key]);
        if (found) return found;
      }
    }
  }
  return null;
}

function stringifyError(v: unknown): string {
  if (typeof v === "string" && v.trim()) return v;
  if (v && typeof v === "object") {
    try {
      const json = JSON.stringify(v);
      if (json && json !== "{}") return json;
    } catch {}
  }
  return "ERRORS.UNEXPECTED_ERROR";
}

export async function handleError(
  e: unknown,
  t?: ReturnType<typeof useTranslations<never>>,
  toastId?: string,
) {
  let source: unknown = e;
  if (e && typeof e === "object") {
    if ("data" in e) source = e.data;
    else if ("response" in e && e.response instanceof Response)
      source = await e.response
        .clone()
        .json()
        .catch(() => null);
    else if (e instanceof Error) source = e.message;
  }

  const found = pickMessage(source);
  const message = found?.message || "ERRORS.UNEXPECTED_ERROR";
  const title =
    t && t.has(message as TranslationKey)
      ? t(message as TranslationKey, found?.params)
      : message;

  const detail = extractErrorDetail(e);
  const tag = [detail.status ? `HTTP ${detail.status}` : null, detail.code]
    .filter(Boolean)
    .join(" ");
  const description = tag && !title.includes(tag) ? tag : undefined;

  toast.error(title, { duration: 5000, id: toastId, description });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type SaveFilePicker = (opts: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<{
  createWritable: () => Promise<WritableStream<Uint8Array>>;
}>;

// Stream a file straight to disk via the File System Access API where available
// (desktop Chromium, Android Chrome) so large files never fully materialize in
// the JS heap. Falls back to a blob-URL download on unsupported platforms (iOS
// Safari lacks showSaveFilePicker and SW-controlled downloads). Returns which
// path was taken. A user-cancelled picker resolves without downloading.
export async function streamFileToDisk(
  file: File,
  filename: string,
): Promise<"fsa" | "blob" | "cancelled"> {
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker;
  if (typeof picker === "function") {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [
          {
            description: "SQLite database",
            accept: { "application/x-sqlite3": [".sqlite3"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await file.stream().pipeTo(writable);
      return "fsa";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError")
        return "cancelled";
      // Any other failure (partial write, permission) falls through to blob.
    }
  }
  downloadBlob(file, filename);
  return "blob";
}

export function downloadJson(
  obj: unknown,
  filename: string,
  opts?: { pretty?: boolean },
) {
  const pretty = opts?.pretty ?? true;
  const json = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, filename);
}

export async function fileToScaledDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("decode failed"));
    el.src = dataUrl;
  });
  const scale = Math.min(1, IMAGE_MAX_DIM / Math.max(img.width, img.height));
  if (scale >= 1 && file.size < 1_500_000) return dataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  return canvas.toDataURL(mime, 0.9);
}

export function splitDataUrl(dataUrl: string): {
  mimeType: string;
  base64: string;
} | null {
  const m = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { mimeType: m[1], base64: m[2] };
}

export function setSearchParam(key: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState(null, "", url.toString());
}
