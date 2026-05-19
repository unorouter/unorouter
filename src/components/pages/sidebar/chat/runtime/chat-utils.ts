import { GUEST_USER_ID } from "@/lib/config/constants";
import { upsertLocalMedia } from "@/lib/db/client/data/writes";
import { uid } from "@/lib/utils/base";
import { setConvId } from "@/store/chat-store";
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

// Local-first: base64 -> per-user OPFS media table -> data: URL for stream.
// Blob stays local until user opts conv into sync (sync.service.ts uploads
// to R2 and stamps r2_url on the Turso mirror row).
export function createLocalAttachmentAdapter(
  getContext: () => { convId: string | null; userId: number },
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

      // New thread needs a pre-generated convId so the media row has a stable
      // cascade parent.
      if (!ctx.convId) {
        ctx.convId = uid();
        setConvId(ctx.convId);
      }

      const file = attachment.file!;
      const base64 = await fileToBase64(file);
      const dataUrl = `data:${file.type};base64,${base64}`;

      await upsertLocalMedia(ctx.userId ?? GUEST_USER_ID, {
        id: attachment.id,
        convId: ctx.convId,
        mimeType: file.type,
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
            mimeType: file.type,
            filename: attachment.name,
            data: dataUrl,
          },
        ],
      };
    },

    async remove() {},
  };
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip `data:<mime>;base64,` prefix.
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
