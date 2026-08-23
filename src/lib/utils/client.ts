import { AUTH_REDIRECT_COOKIE, IMAGE_MAX_DIM } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/config/constants";
import { setCookie } from "cookies-next/client";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import type { Extracted } from "@/lib/types";
import { asParams } from "@/lib/utils/base";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import {
  DefaultErrorFunction,
  SetErrorFunction,
  ValueErrorType,
} from "@sinclair/typebox/errors";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

SetErrorFunction((error) => {
  // A schema carries ONE error string, so a field with both bounds would
  // otherwise report its minLength message for a too-long value.
  if (
    error.errorType === ValueErrorType.StringMaxLength &&
    typeof error.schema.maxLength === "number"
  ) {
    return "FORM.ERROR.MAX_LENGTH";
  }
  if (typeof error.schema.error === "string") return error.schema.error;
  return DefaultErrorFunction(error);
});

type ErrorDetail = {
  message: string;
  /** ICU values for `message` when it is a translation key. */
  params?: Record<string, string | number>;
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
    else if (typeof obj.status === "number") status = obj.status;
    if (typeof obj.responseBody === "string" && obj.responseBody.trim())
      body = obj.responseBody;
    else if ("data" in obj && obj.data != null) body = obj.data;
    // Eden Treaty parks a non-2xx body under error.value.
    else if ("error" in obj && obj.error != null) {
      const edenError = obj.error as { value?: unknown };
      body = edenError.value ?? edenError;
    } else if (e instanceof Error) body = e.message;
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
  let message =
    found?.message || stringifyError((e as Error)?.message ?? errObj ?? e);
  // A Cloudflare 5xx body is a whole HTML page.
  if (/<(?:html|head|body|div|!doctype)[\s>]/i.test(message)) {
    const plain = message
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    message = plain.slice(0, 300) || message.slice(0, 300);
  }

  let code: string | undefined;
  if (errObj && typeof errObj === "object") {
    const c = (errObj as { code?: unknown }).code;
    if (typeof c === "string" && c) code = c;
  }

  const requestId = message.match(REQUEST_ID_RE)?.[1];
  return { message, params: found?.params, code, status, requestId };
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
        const text = obj[key] as string;
        // Runware names the offending field on `parameter`.
        const parameter =
          typeof obj.parameter === "string" ? obj.parameter : null;
        return {
          message:
            parameter && !text.includes(parameter)
              ? `${text} (${parameter})`
              : text,
          params: asParams(obj.params),
        };
      }
    }
    for (const key of ["error", "data", "body", "response", "value"]) {
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

export function handleError(
  e: unknown,
  t?: ReturnType<typeof useTranslations<never>>,
  toastId?: string,
) {
  const detail = extractErrorDetail(e);
  const title =
    t && t.has(detail.message as TranslationKey)
      ? t(detail.message as TranslationKey, detail.params)
      : detail.message;

  const tag = [detail.status ? `HTTP ${detail.status}` : null, detail.code]
    .filter(Boolean)
    .join(" ");
  const description = tag && !title.includes(tag) ? tag : undefined;

  if (detail.status === 401 || detail.status === 419) {
    redirectToLoginPreservingLocation();
    return;
  }
  toast.error(title, { duration: 5000, id: toastId, description });
}

// Gated on the auth cache because 401 is legitimate for a guest (BYOK, paid
// model without a session) and redirecting them would hide the real error.
function redirectToLoginPreservingLocation() {
  if (typeof window === "undefined") return;
  if (!getQueryClient().getQueryData(queryKeys.auth())) return;
  if (/\/(login|register)(\/|$)/.test(window.location.pathname)) return;
  const path = window.location.pathname + window.location.search;
  setCookie(AUTH_REDIRECT_COOKIE, stripLocale(path), { maxAge: 600 });
  window.location.assign(loginHref());
}

function stripLocale(path: string): string {
  const stripped = path.replace(/^\/[a-z]{2}(-[A-Z]{2})?(?=\/|$)/, "");
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

function loginHref(): string {
  const match = /^\/([a-z]{2}(?:-[A-Z]{2})?)(?=\/|$)/.exec(
    window.location.pathname,
  );
  return match ? `/${match[1]}/login` : "/login";
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Safari ignores a click on a detached anchor.
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking before the fetch starts makes Safari navigate to a dead blob: URL.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

type SaveFilePicker = (opts: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<{
  createWritable: () => Promise<WritableStream<Uint8Array>>;
  getFile?: () => Promise<File>;
}>;

// Streams to disk via File System Access where available so a large file never
// materializes in the JS heap; iOS falls through to Web Share, then a blob.
export async function streamFileToDisk(
  file: File,
  filename: string,
): Promise<"fsa" | "share" | "blob" | "cancelled"> {
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker;
  // iOS 26 exposes showSaveFilePicker but its pipeTo silently truncates.
  const likelyIos =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; title?: string }) => Promise<void>;
  };
  logChatDebug("save.begin", {
    bytes: file.size,
    filename,
    likelyIos,
    hasPicker: typeof picker === "function",
    hasShare: typeof nav.share === "function",
    sourceType: file.type,
    canShareSource: nav.canShare?.({ files: [file] }) ?? null,
    ua: navigator.userAgent.slice(0, 120),
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  });
  if (typeof picker === "function" && !likelyIos) {
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
      // A truncating write reports no error, so measure rather than trust it.
      const written = await handle
        .getFile?.()
        .then((f) => f.size)
        .catch(() => null);
      logChatDebug("save.done", {
        path: "fsa",
        bytes: file.size,
        writtenBytes: written ?? null,
        truncated: written != null && written < file.size,
      });
      return "fsa";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        logChatDebug("save.cancelled", { path: "fsa" });
        return "cancelled";
      }
      // Any other failure (partial write, permission) falls through to blob.
      logChatDebug("save.fsa_failed", { error: String(err).slice(0, 200) });
    }
  }
  // octet-stream and no title: iOS has no x-sqlite3 handler, so the share sheet
  // degrades to sharing the title as text (9MB DB saved as a 45-byte txt).
  const shareFile = new File([file], filename, {
    type: "application/octet-stream",
  });
  const canShareRewrapped = nav.canShare?.({ files: [shareFile] }) ?? null;
  logChatDebug("save.share_probe", {
    sourceType: file.type,
    shareType: shareFile.type,
    canShareSource: nav.canShare?.({ files: [file] }) ?? null,
    canShareRewrapped,
    shareBytes: shareFile.size,
  });
  if (typeof nav.share === "function" && canShareRewrapped) {
    try {
      await nav.share({ files: [shareFile] });
      logChatDebug("save.done", {
        path: "share",
        bytes: shareFile.size,
        sharedType: shareFile.type,
        sharedName: shareFile.name,
      });
      return "share";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        logChatDebug("save.cancelled", { path: "share" });
        return "cancelled";
      }
      // Share unavailable in practice: fall through to the blob anchor.
      logChatDebug("save.share_failed", { error: String(err).slice(0, 200) });
    }
  }
  downloadBlob(file, filename);
  logChatDebug("save.done", { path: "blob", bytes: file.size });
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
