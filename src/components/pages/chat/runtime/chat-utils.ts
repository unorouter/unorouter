import { handleElysia, uid } from "@/lib/utils/base";
import { rpc } from "@/lib/rpc";
import { setConvId } from "@/store/chat-store";
import type { AttachmentAdapter } from "@assistant-ui/react";

/** Extracts text from the first user message in a list of content-bearing messages. */
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

export function createR2AttachmentAdapter(
  getContext: () => { convId: string | null },
): AttachmentAdapter {
  return {
    accept: "image/png,image/jpeg,image/webp,image/gif,application/pdf",

    async add({ file }) {
      return {
        id: uid(),
        type: file.type.startsWith("image/") ? "image" : "file",
        name: file.name,
        file,
        contentType: file.type,
        content: [],
        status: { type: "requires-action", reason: "composer-send" },
      };
    },

    async send(attachment) {
      const ctx = getContext();

      // Ensure a convId exists for R2 upload (new thread gets one pre-generated)
      if (!ctx.convId) {
        ctx.convId = uid();
        setConvId(ctx.convId);
      }

      const data = handleElysia(
        await rpc.api.chat.media.post({
          file: attachment.file!,
          convId: ctx.convId,
        }),
      );
      return {
        ...attachment,
        status: { type: "complete" },
        content: [
          {
            type: "file",
            mimeType: data.mimeType,
            filename: attachment.name,
            data: data.url,
          },
        ],
      };
    },

    async remove() {},
  };
}
