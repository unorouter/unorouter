import { IMAGE_MAX_DIM } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/config/constants";
import type { Extracted } from "@/lib/types";
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

function extractMessageFromJson(raw: string): Extracted | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const m = (parsed as { message?: unknown }).message;
      if (typeof m === "string") {
        const p = (parsed as { params?: unknown }).params;
        return {
          message: m,
          params:
            p && typeof p === "object"
              ? (p as Record<string, string | number>)
              : undefined,
        };
      }
    }
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (typeof item === "string") return { message: item };
        if (
          item &&
          typeof item === "object" &&
          typeof (item as { message?: unknown }).message === "string"
        ) {
          return { message: (item as { message: string }).message };
        }
      }
    }
  } catch {
    // not JSON
  }
  return null;
}

export async function handleError(
  e: unknown,
  t?: ReturnType<typeof useTranslations<never>>,
  toastId?: string,
) {
  let message = "";
  let params: Record<string, string | number> | undefined;

  if (e instanceof Error) {
    message = e.message;
    // `ai` SDK surfaces failed stream responses as Error(bodyText).
    if (message.startsWith("{") || message.startsWith("[")) {
      const extracted = extractMessageFromJson(message);
      if (extracted) {
        message = extracted.message;
        params = extracted.params;
      }
    }
  } else if (e !== null && typeof e === "object") {
    if (
      "data" in e &&
      e.data !== null &&
      typeof e.data === "object" &&
      "message" in e.data
    ) {
      const d = e.data as Record<string, unknown>;
      message = String(d.message);
      if (d.params && typeof d.params === "object") {
        params = d.params as Record<string, string | number>;
      }
    } else if ("data" in e && typeof e.data === "string") {
      message = e.data;
    } else if ("response" in e && e.response instanceof Response) {
      const body = await e.response
        .clone()
        .json()
        .catch(() => null);
      if (body && typeof body === "object" && "message" in body) {
        message = String(body.message);
        const p = (body as { params?: unknown }).params;
        if (p && typeof p === "object") {
          params = p as Record<string, string | number>;
        }
      }
    }
  }

  if (!message) message = "ERRORS.UNEXPECTED_ERROR";

  const title =
    t && t.has(message as TranslationKey)
      ? t(message as TranslationKey, params)
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
