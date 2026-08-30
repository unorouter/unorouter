import {
  deleteLocalMedia,
  upsertLocalMedia,
} from "@/lib/db/client/data/media/media";
import { base64ToDataUri, fileToBase64, uid } from "@/lib/utils/base";
import { ensureConvId } from "@/store/chat-store";
import type { AttachmentAdapter } from "@assistant-ui/react";

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
};

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
      ".txt,.md,.markdown,.csv,.json,.xml,.yaml,.yml,.log",

    async add({ file }) {
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

      const file = attachment.file!;
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
      await deleteLocalMedia(attachment.id);
    },
  };
}
