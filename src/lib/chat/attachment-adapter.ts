import type { AttachmentAdapter } from "@assistant-ui/react";
import { generateId } from "ai";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

/**
 * Creates an attachment adapter that uploads files to R2 via /api/chat/media.
 * The convId and msgId are passed as a ref so they can be updated dynamically
 * as conversations are created.
 */
export function createR2AttachmentAdapter(
  getContext: () => { convId: string | null; msgId: string },
): AttachmentAdapter {
  return {
    accept: "image/png,image/jpeg,image/webp,image/gif,.pdf",

    async add({ file }) {
      if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}`);
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File too large (max 20MB)");
      }

      return {
        id: generateId(),
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
        // Fall back to data URL if no conversation yet
        const dataUrl = await readFileAsDataURL(attachment.file!);
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

      // Upload to R2
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
      const data = json.data as { url: string; mimeType: string };

      return {
        ...attachment,
        status: { type: "complete" as const },
        content: [
          {
            type: "file" as const,
            mimeType: data.mimeType,
            filename: attachment.name,
            data: data.url,
          },
        ],
      };
    },

    async remove() {
      // R2 cleanup is not needed client-side
    },
  };
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
