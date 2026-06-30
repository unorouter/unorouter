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

// Full error detail (message + code + status + requestId) for display/debugging. Handles ai-sdk APICallError (responseBody/statusCode), Eden errors, and plain JSON bodies.
export function extractErrorDetail(e: unknown): ErrorDetail {
  let status: number | undefined;
  let body: unknown = e;

  if (e && typeof e === "object") {
    const obj = e as Record<string, unknown>;
    if (typeof obj.statusCode === "number") status = obj.statusCode;
    if (typeof obj.responseBody === "string") body = obj.responseBody;
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
  const message = found?.message || String((e as Error)?.message ?? e);

  let code: string | undefined;
  if (errObj && typeof errObj === "object") {
    const c = (errObj as { code?: unknown }).code;
    if (typeof c === "string" && c) code = c;
  }

  const requestId = message.match(REQUEST_ID_RE)?.[1];
  return { message, code, status, requestId };
}

// Pull {message, params} out of any error shape: JSON string, {message} object, or array. JSON strings recurse.
function pickMessage(v: unknown): Extracted | null {
  if (typeof v === "string") {
    const s = v.trim();
    if (s.startsWith("{") || s.startsWith("[")) {
      try {
        return pickMessage(JSON.parse(s));
      } catch {
        // not JSON; fall through to the raw string
      }
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
    const m = (v as { message?: unknown }).message;
    if (typeof m === "string") {
      return {
        message: m,
        params: asParams((v as { params?: unknown }).params),
      };
    }
  }
  return null;
}

export async function handleError(
  e: unknown,
  t?: ReturnType<typeof useTranslations<never>>,
  toastId?: string,
) {
  // Eden errors carry the body on .data, a thrown fetch on .response. Otherwise pickMessage walks the value.
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

  // Append the upstream code/status so a bare "bad request" is debuggable. requestId already rides inside the message.
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

export function downloadJson(
  obj: unknown,
  filename: string,
  opts?: { pretty?: boolean },
) {
  // Compact when pretty is false (diagnostics: halves bytes / memory); indented by default.
  const pretty = opts?.pretty ?? true;
  const json = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, filename);
}

// Downscale + re-encode so a large upload doesn't blow the localStorage/OPFS quota.
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

// data:<mime>;base64,<bytes> -> parts for a media row.
export function splitDataUrl(dataUrl: string): {
  mimeType: string;
  base64: string;
} | null {
  const m = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { mimeType: m[1], base64: m[2] };
}

// Update one URL search param without navigation; null removes.
export function setSearchParam(key: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState(null, "", url.toString());
}
