"use client";

import type { MessagePart } from "@/lib/ai/chat/messages";
import { upsertLocalMedia } from "@/lib/db/client/data/media/media";
import { uid } from "@/lib/utils/base";

const DATA_MEDIA_RE =
  /!\[[^\]]*\]\(data:((?:image|video|audio)\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)\)/g;
// Relays that serve video through chat answer with an HTML tag, sometimes in an
// html fence; markdown renders neither as a player.
const VIDEO_TAG_RE =
  /(?:```html\s*)?<video\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>(?:\s*<\/video>)?(?:\s*```)?/gi;

async function rewriteText(convId: string, text: string): Promise<string> {
  let out = text.replace(VIDEO_TAG_RE, (_m, src: string) => `![video](${src})`);
  const found = [...out.matchAll(DATA_MEDIA_RE)];
  for (const m of found) {
    const id = uid();
    const dataBase64 = m[2];
    await upsertLocalMedia({
      id,
      convId,
      mimeType: m[1],
      sizeBytes: Math.floor((dataBase64.length * 3) / 4),
      dataBase64,
    });
    out = out.replace(m[0], `{{inlay::${id}}}`);
  }
  return out;
}

// Inline base64 media moves out of the stored reply text into local media, the
// same storage generated images use, so the message row stays small.
export async function storeInlineMedia(
  convId: string,
  parts: MessagePart[],
): Promise<MessagePart[]> {
  return Promise.all(
    parts.map(async (p) =>
      p.type === "text" &&
      (p.text.includes("](data:") || /<video\b/i.test(p.text))
        ? { ...p, text: await rewriteText(convId, p.text) }
        : p,
    ),
  );
}
