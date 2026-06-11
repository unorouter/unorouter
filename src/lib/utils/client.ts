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

// Pull {message, params} out of any error shape: a JSON string, a `{message}`
// object, or an array of strings/`{message}` objects. JSON strings recurse.
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
  // Eden errors carry the body on `.data`; a thrown fetch carries it on
  // `.response`. Otherwise pickMessage walks the value (Error.message included).
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

  toast.error(title, { duration: 5000, id: toastId });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
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
