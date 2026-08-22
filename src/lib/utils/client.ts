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
  // A schema carries ONE error string, so a field with both bounds would report
  // its minLength message for a too-long value. maxLength gets its own key.
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
  // Error bodies can be entire HTML pages (Cloudflare 5xx). Strip markup and
  // cap so the chat shows one line, not kilobytes of raw HTML.
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
        // Runware names the offending field on `parameter`. Without it a rejected knob
        // reads as a generic failure and the user cannot tell WHICH control to change.
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
    // "value" is where Eden Treaty parks a non-2xx response body.
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

async function resolveDetail(e: unknown): Promise<ErrorDetail> {
  if (
    e &&
    typeof e === "object" &&
    "response" in e &&
    e.response instanceof Response
  ) {
    const body = await e.response
      .clone()
      .json()
      .catch(() => null);
    if (body) return { ...extractErrorDetail(body), status: e.response.status };
  }
  return extractErrorDetail(e);
}

export async function handleError(
  e: unknown,
  t?: ReturnType<typeof useTranslations<never>>,
  toastId?: string,
) {
  // A fetch Response is the one shape extractErrorDetail cannot take, because
  // reading its body is async; hand it the parsed body instead.
  const detail = await resolveDetail(e);
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

// A long-lived tab (an RP session left open) only learns its token died when a
// request fails: the auth cache never refetches and nothing re-renders on the
// server. Send them to login rather than leaving a logged-in shell whose every
// action 401s, which reads as data loss and pushes people to clear storage.
//
// Gated on the auth cache so a guest keeps seeing the real error: 401 is a
// legitimate answer for anonymous callers (BYOK, paid model without a session)
// and bouncing them to login would hide it. The prefetch seeds null for a
// guest, so a present-but-null entry is a definite "not logged in".
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
  // The anchor must be IN the document for the click to count as user-initiated
  // in Safari; a detached one is ignored (and for a large blob that silently
  // does nothing at all).
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously kills the URL before the download has actually
  // started - Safari then either drops the file or navigates to a dead blob:
  // URL, unmounting the app. Give the fetch a turn to begin.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

type SaveFilePicker = (opts: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<{
  createWritable: () => Promise<WritableStream<Uint8Array>>;
  getFile?: () => Promise<File>;
}>;

// Stream a file straight to disk via the File System Access API where available
// (desktop Chromium, Android Chrome) so large files never fully materialize in
// the JS heap. Falls back to a blob-URL download on unsupported platforms (iOS
// Safari lacks showSaveFilePicker and SW-controlled downloads). Returns which
// path was taken. A user-cancelled picker resolves without downloading.
export async function streamFileToDisk(
  file: File,
  filename: string,
): Promise<"fsa" | "share" | "blob" | "cancelled"> {
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker })
    .showSaveFilePicker;
  // Feature detection alone stopped being enough: iOS Safari 26 EXPOSES
  // showSaveFilePicker, but its createWritable/pipeTo silently truncates (a
  // 9MB database export landed on disk as 45 bytes with no error to catch).
  // iOS always takes the Web Share path below, which its save sheet handles.
  const likelyIos =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; title?: string }) => Promise<void>;
  };
  // Every input to the branch choice, because a wrong branch is invisible in the
  // result: the file lands on disk at the wrong size with no error anywhere.
  logChatDebug("save.begin", {
    bytes: file.size,
    filename,
    likelyIos,
    hasPicker: typeof picker === "function",
    hasShare: typeof nav.share === "function",
    // Both types, because the ORIGINAL mime is what iOS refused to route as a
    // file: a false here next to a true below is the whole bug in one line.
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
      // Read back what actually landed. iOS Safari 26 accepts the whole write
      // and leaves a stub on disk, reporting no error, so the only way to know
      // the save worked is to measure the result rather than trust the API.
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
  // iOS Safari has no showSaveFilePicker AND largely ignores the `download`
  // attribute for blob: URLs - it NAVIGATES to them instead, which unmounts the
  // app and loses the file (a user trying to rescue a database saw the page
  // "refresh" and land somewhere else). Web Share hands the file to the real
  // save sheet instead. Only offered when the platform says it can take this
  // exact file, and a user cancel is not an error.
  // application/x-sqlite3 has no registered handler on iOS, so the share sheet
  // cannot route it AS A FILE and silently degrades to sharing the accompanying
  // text: "Save to Files" then wrote the title into `text 9.txt`, 45 bytes,
  // instead of a 9MB database. Re-wrap as octet-stream and send NO title, so the
  // file is the only thing in the payload.
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
      // Distinct from "fsa": both used to report the same value, so a log could
      // not say WHICH save path produced the file on disk.
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
