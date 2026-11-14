import type { StreamMessages } from "@/lib/ai/chat/pipeline/transforms";
import { base64ToUint8 } from "@/lib/utils/base";

async function extractPdfText(bytes: Uint8Array): Promise<string | null> {
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

const PDF = "application/pdf";
const TEXT_MEDIA_TYPE = /^text\/|^application\/(json|xml|x-yaml|yaml)$/;

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
      m.parts.some(
        (p) =>
          p.type === "file" &&
          (p.mediaType === PDF || TEXT_MEDIA_TYPE.test(p.mediaType)),
      ),
  );
  if (!hasInlinable) return messages;

  return Promise.all(
    messages.map(async (m) => {
      if (m.role !== "user") return m;
      const parts = await Promise.all(
        m.parts.map(async (part) => {
          if (part.type !== "file") return part;
          if (part.mediaType === PDF) {
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
          if (!TEXT_MEDIA_TYPE.test(part.mediaType)) return part;
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
