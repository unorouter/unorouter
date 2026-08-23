import type { StreamMessages } from "@/lib/ai/chat/pipeline/transforms";
import { base64ToUint8 } from "@/lib/utils/base";

export async function extractPdfText(
  bytes: Uint8Array,
): Promise<string | null> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: true });
    const text = Array.isArray(result.text)
      ? result.text.join("\n")
      : result.text;
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

type PdfFilePart = {
  type: "file";
  mediaType: "application/pdf";
  url: string;
  filename?: string;
};

function isPdfFilePart(part: unknown): part is PdfFilePart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    part.type === "file" &&
    "mediaType" in part &&
    part.mediaType === "application/pdf" &&
    "url" in part &&
    typeof part.url === "string"
  );
}

// Text attachments need the same treatment as PDFs: a data URI reaches the model
// as an opaque blob most cannot read, so the content is inlined as text instead.
// Kept broad because editors label the same file inconsistently (text/markdown,
// application/json, text/x-log), and anything mislabelled simply decodes to its
// own contents.
const TEXT_MEDIA_TYPE = /^text\/|^application\/(json|xml|x-yaml|yaml)$/;

type TextFilePart = {
  type: "file";
  mediaType: string;
  url: string;
  filename?: string;
};

function isTextFilePart(part: unknown): part is TextFilePart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    part.type === "file" &&
    "mediaType" in part &&
    typeof part.mediaType === "string" &&
    TEXT_MEDIA_TYPE.test(part.mediaType) &&
    "url" in part &&
    typeof part.url === "string"
  );
}

function decodeDataUriText(url: string): string | null {
  const comma = url.indexOf(",");
  if (comma < 0) return null;
  try {
    const bytes = base64ToUint8(url.slice(comma + 1));
    const text = new TextDecoder().decode(bytes).trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export async function inlinePdfText(
  messages: StreamMessages,
): Promise<StreamMessages> {
  const hasInlinable = messages.some(
    (m) =>
      m.role === "user" &&
      Array.isArray(m.parts) &&
      m.parts.some((p) => isPdfFilePart(p) || isTextFilePart(p)),
  );
  if (!hasInlinable) return messages;

  return Promise.all(
    messages.map(async (m) => {
      if (m.role !== "user" || !Array.isArray(m.parts)) return m;
      const parts = await Promise.all(
        m.parts.map(async (part) => {
          // PDF first: its mediaType is a literal, so checking the broader text
          // guard ahead of it narrows this branch away entirely.
          if (isPdfFilePart(part)) {
            const name = part.filename ?? "document.pdf";
            const comma = part.url.indexOf(",");
            const b64 = comma >= 0 ? part.url.slice(comma + 1) : "";
            const text = b64 ? await extractPdfText(base64ToUint8(b64)) : null;
            return {
              type: "text" as const,
              text: text
                ? `[Attached PDF "${name}":\n${text}\n]`
                : `[Attached PDF "${name}": extraction unavailable]`,
            };
          }
          if (!isTextFilePart(part)) return part;
          const name = part.filename ?? "file.txt";
          const text = decodeDataUriText(part.url);
          return {
            type: "text" as const,
            text: text
              ? `[Attached file "${name}":\n${text}\n]`
              : `[Attached file "${name}": unreadable]`,
          };
        }),
      );
      return { ...m, parts };
    }),
  );
}
