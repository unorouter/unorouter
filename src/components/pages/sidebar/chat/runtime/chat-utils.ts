import { mediaStore, upsertLocalMedia } from "@/lib/db/client/data/media/media";
import { base64ToDataUri, fileToBase64, uid } from "@/lib/utils/base";
import { ensureConvId } from "@/store/chat-store";
import type { AttachmentAdapter } from "@assistant-ui/react";
import { GUEST_USER_ID, msg } from "@/lib/config/constants";
import { authUserId } from "@/hooks/auth/auth-hook";
import { GUEST_REQUEST_MAX_MB } from "@/lib/validation/chat";
import {
  mhtmlToHtml,
  zipToText,
} from "@/components/pages/sidebar/chat/runtime/attachment-convert";

export function extractFirstUserText(
  messages: readonly {
    role: string;
    content: readonly { type: string; text?: string }[];
  }[],
): string | null {
  const first = messages.find((m) => m.role === "user");
  if (!first) return null;
  return (
    first.content
      .filter(
        (c): c is { type: string; text: string } =>
          c.type === "text" && !!c.text,
      )
      .map((c) => c.text)
      .join(" ")
      .trim() || null
  );
}

// The OS leaves file.type empty for extensions it has no entry for (.md, .log).
const TEXT_EXTENSIONS: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  log: "text/plain",
  csv: "text/csv",
  json: "application/json",
  xml: "text/xml",
  yaml: "text/yaml",
  yml: "text/yaml",
  html: "text/html",
  htm: "text/html",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

// Gemini takes about 20 MB of inline data per request, base64 included.
// CHAT.ATTACHMENT.VIDEO_TOO_LARGE states this number.
const MAX_VIDEO_MB = 15;

async function convertFile(file: File): Promise<File> {
  if (
    file.size > GUEST_REQUEST_MAX_MB * 1024 * 1024 &&
    authUserId() === GUEST_USER_ID
  )
    throw new Error(msg("ERRORS.LARGE_UPLOAD_LOGIN"));
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "zip" || file.type.includes("zip")) return zipToText(file);
  if (ext === "mhtml" || ext === "mht" || file.type === "multipart/related")
    return mhtmlToHtml(file);
  if (resolveTextMime(file).startsWith("video/")) {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024)
      throw new Error(msg("CHAT.ATTACHMENT.VIDEO_TOO_LARGE"));
  }
  return file;
}

function resolveTextMime(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TEXT_EXTENSIONS[ext] ?? "text/plain";
}

export function createLocalAttachmentAdapter(): AttachmentAdapter {
  return {
    // The bare extensions are load-bearing: type-only matching rejects .md and .log.
    accept:
      "image/png,image/jpeg,image/webp,image/gif,application/pdf," +
      "text/plain,text/markdown,text/csv,application/json,text/xml,application/xml," +
      "text/html,multipart/related,application/zip,video/mp4,video/webm,video/quicktime," +
      ".txt,.md,.markdown,.csv,.json,.xml,.yaml,.yml,.log,.html,.htm,.mhtml,.mht,.zip,.mp4,.webm,.mov",

    async add({ file: picked }) {
      const file = await convertFile(picked);
      const contentType = resolveTextMime(file);
      return {
        id: uid(),
        type: contentType.startsWith("image/") ? "image" : "file",
        name: file.name,
        file,
        contentType,
        content: [],
        status: { type: "requires-action", reason: "composer-send" },
      };
    },

    async send(attachment) {
      // Side effect only: claims a convId for the send that follows.
      ensureConvId();

      const file = attachment.file;
      const base64 = await fileToBase64(file);
      const mime = resolveTextMime(file);
      const dataUrl = base64ToDataUri(base64, mime);

      await upsertLocalMedia({
        id: attachment.id,
        convId: null,
        mimeType: mime,
        sizeBytes: file.size,
        dataBase64: base64,
        r2Key: null,
        r2Url: null,
      });

      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "file",
            mimeType: mime,
            filename: attachment.name,
            data: dataUrl,
          },
        ],
      };
    },

    async remove(attachment) {
      await mediaStore.drop(attachment.id);
    },
  };
}
