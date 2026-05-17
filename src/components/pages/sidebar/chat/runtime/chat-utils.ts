import { upsertLocalMedia } from "@/lib/local-db/writes";
import { uid } from "@/lib/utils/base";
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

// Local-first attachment adapter. Reads the file into base64, writes it to the
// per-user OPFS `media` table, and returns a `data:` URL for the stream to
// consume. The blob never touches the network until/unless the user opts
// the parent conversation into sync, at which point `sync.service.ts` uploads
// the base64 to R2 and stamps `r2_url` on the Turso mirror row.
export function createLocalAttachmentAdapter(
  getContext: () => { convId: string | null; userId: number | null },
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

      // Ensure a convId exists - new thread gets one pre-generated so the
      // media row has a stable cascade parent.
      if (!ctx.convId) {
        ctx.convId = uid();
        setConvId(ctx.convId);
      }

      const file = attachment.file!;
      const base64 = await fileToBase64(file);
      const dataUrl = `data:${file.type};base64,${base64}`;

      // Persist locally if logged in; guests just get the data URL in memory
      // (no OPFS write because we can't open a user-scoped DB without an id).
      if (ctx.userId != null) {
        await upsertLocalMedia(ctx.userId, {
          id: attachment.id,
          convId: ctx.convId,
          mimeType: file.type,
          sizeBytes: file.size,
          dataBase64: base64,
          r2Key: null,
          r2Url: null,
        });
      }

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
      // result = `data:<mime>;base64,<payload>`. Strip the prefix.
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
