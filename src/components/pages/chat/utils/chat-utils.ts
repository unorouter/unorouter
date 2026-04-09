import type { MessagePart } from "@/lib/types/chat";
import { handleElysia, uid } from "@/lib/utils/base";
import { rpc } from "@/lib/rpc";
import { setConvId } from "@/store/chat-store";
import type { useChat } from "@ai-sdk/react";
import type { AttachmentAdapter } from "@assistant-ui/react";
import type { UIMessage } from "ai";

export function mapRawMessages(
  raw: { id: string; role: string; parts: unknown }[],
): UIMessage[] {
  return raw.map((msg) => ({
    id: msg.id,
    role: msg.role as UIMessage["role"],
    parts: (msg.parts as UIMessage["parts"]) ?? [],
  }));
}

export function getTextContent(message: UIMessage) {
  if (!message.parts) return "";
  return message.parts
    .filter((p) => p.type === "text")
    .map((p) => ("text" in p ? p.text : ""))
    .join("");
}

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

export function extractParts(
  input: Parameters<ReturnType<typeof useChat>["sendMessage"]>[0],
) {
  if (!input) return [];
  if (typeof input === "string") return [{ type: "text", text: input }];

  const msg = input as {
    text?: string;
    parts?: MessagePart[];
  };
  if (msg.parts) return msg.parts;
  if (msg.text) return [{ type: "text", text: msg.text }];
  return [];
}

export function createR2AttachmentAdapter(
  getContext: () => { convId: string | null },
): AttachmentAdapter {
  return {
    accept: "image/png,image/jpeg,image/webp,image/gif,.pdf",

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
