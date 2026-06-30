// PDF text extraction (unpdf, isomorphic + serverless-safe, no native deps). Lazy-imported so the PDF.js
// payload never lands in the first-paint bundle / cold server start; only loads when a PDF is actually present.
// PDF attachments are inline `data:application/pdf;base64,...` parts (local-first), so the bytes are in the
// message itself. Both the server stream path and the browser custom-provider path call inlinePdfText.

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
    // Best-effort: a malformed/encrypted PDF just yields no text (placeholder downstream).
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
  const p = part as Partial<PdfFilePart>;
  return (
    p?.type === "file" &&
    p.mediaType === "application/pdf" &&
    typeof p.url === "string"
  );
}

// Replace each user PDF file part with its extracted text (or a placeholder). No-op when no PDFs present,
// so the unpdf chunk only loads on a turn that actually carries one.
export async function inlinePdfText(
  messages: StreamMessages,
): Promise<StreamMessages> {
  const hasPdf = messages.some(
    (m) =>
      m.role === "user" &&
      Array.isArray(m.parts) &&
      m.parts.some(isPdfFilePart),
  );
  if (!hasPdf) return messages;

  return Promise.all(
    messages.map(async (m) => {
      if (m.role !== "user" || !Array.isArray(m.parts)) return m;
      const parts = await Promise.all(
        m.parts.map(async (part) => {
          if (!isPdfFilePart(part)) return part;
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
        }),
      );
      return { ...m, parts };
    }),
  );
}
