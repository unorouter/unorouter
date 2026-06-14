import { deleteLocalMedia, upsertLocalMedia } from "@/lib/db/client/data/media";
import { base64ToDataUri, fileToBase64, uid } from "@/lib/utils/base";
import { chatStore, ensureConvId, localUserIdAtom } from "@/store/chat-store";
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

// Local-first: base64 -> OPFS media -> data: URL. Sync uploads to R2 later.
export function createLocalAttachmentAdapter(
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

          // Pre-gen the convId for the live stream but DON'T stamp it on the media row: ensureConvId only mints the id, the conversations row is inserted later, so stamping a not-yet-inserted convId tripped the media.conv_id FK. Bytes ride the data: URL part; the media row stays conv-null.
      ctx.convId = ensureConvId();

      const file = attachment.file!;
      const base64 = await fileToBase64(file);
      const dataUrl = base64ToDataUri(base64, file.type);

      await upsertLocalMedia(chatStore.get(localUserIdAtom), {
        id: attachment.id,
        convId: null,
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

    async remove(attachment) {
      await deleteLocalMedia(chatStore.get(localUserIdAtom), attachment.id);
    },
  };
}
