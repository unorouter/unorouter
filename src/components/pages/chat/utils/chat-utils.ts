import { uid } from "@/lib/utils/base";
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

export function extractParts(
  input: Parameters<ReturnType<typeof useChat>["sendMessage"]>[0],
) {
  if (!input) return [];
  if (typeof input === "string") return [{ type: "text", text: input }];

  const msg = input as {
    text?: string;
    parts?: { type: string; [key: string]: unknown }[];
  };
  if (msg.parts) return msg.parts;
  if (msg.text) return [{ type: "text", text: msg.text }];
  return [];
}

export function createR2AttachmentAdapter(
  getContext: () => { convId: string | null; msgId: string },
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

      if (!ctx.convId) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(attachment.file!);
        });
        return {
          ...attachment,
          status: { type: "complete" as const },
          content: [
            {
              type: "file" as const,
              mimeType: attachment.contentType ?? "",
              filename: attachment.name,
              data: dataUrl,
            },
          ],
        };
      }

      const formData = new FormData();
      formData.append("file", attachment.file!);
      formData.append("convId", ctx.convId);
      formData.append("msgId", ctx.msgId);

      const res = await fetch("/api/chat/media", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload attachment");
      }

      const json = await res.json();
      const data = json.data;

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
