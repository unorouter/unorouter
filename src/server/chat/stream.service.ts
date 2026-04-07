import { ModelType } from "@/lib/api/pricing";
import { isMediaModel } from "@/lib/api/pricing-cache";
import {
  downloadAndUpload,
  getContentType,
  isVideoContentType,
  uploadBase64ToR2,
} from "@/lib/config/r2";
import { uid } from "@/lib/utils/base";
import { deriveUpstream, getProvider } from "@/server/constants";
import { serverEnv } from "@/server/env";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import { pendingUsageByConv } from "./message.service";

// ---------------------------------------------------------------------------
// Image processing (mirrors cleanImageParts in message.service.ts)
// ---------------------------------------------------------------------------

// Matches both image embeds ![alt](url) and plain links [text](url)
const LINK_RE = /(!?)\[([^\]]*)\]\((data:[^)]+|https?:\/\/[^)]+)\)/g;

async function processUrls(
  text: string,
  convId: string,
  mediaType: ModelType,
): Promise<string> {
  const matches = [...text.matchAll(LINK_RE)];
  if (matches.length === 0) return text;
  if (mediaType !== "video" && mediaType !== "image") return "";

  const r2Domain = serverEnv.r2PublicUrl ?? "";
  const groupKey = uid(8);

  const process = async ([, , alt, url]: RegExpMatchArray) => {
    if (url.startsWith("data:")) {
      return `![${alt}](${await uploadBase64ToR2(url, convId, groupKey)})`;
    }
    if (url.startsWith(r2Domain)) return `![${alt}](${url})`;

    const contentType = await getContentType(url);
    if (mediaType === "video" && !isVideoContentType(contentType)) return null;
    if (mediaType === "image" && isVideoContentType(contentType)) return null;

    try {
      return `![${alt}](${await downloadAndUpload(url, convId, groupKey)})`;
    } catch {
      return `![${alt}](${url})`;
    }
  };

  return (await Promise.all(matches.map(process))).filter(Boolean).join("\n\n");
}

// ---------------------------------------------------------------------------
// Stream
// ---------------------------------------------------------------------------

export async function streamChat(
  apiKey: string,
  body: {
    model: string;
    messages: Parameters<typeof convertToModelMessages>[0];
    convId?: string | null;
    webSearch?: boolean;
  },
  request: Request,
) {
  const provider = getProvider(apiKey);
  const { upstream } = deriveUpstream({ request });

  // Check if this is an image/video model
  const { buffered, mediaType } = await isMediaModel(body.model);

  const result = streamText({
    model: provider.chatModel(body.model),
    messages: await convertToModelMessages(body.messages),
    providerOptions: body.webSearch
      ? { unorouter: { web_search_options: {} } }
      : undefined,
    onFinish: ({ usage, response }) => {
      if (!body.convId) return;

      pendingUsageByConv.set(body.convId, {
        requestId: response.headers?.["x-oneapi-request-id"] ?? undefined,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        cost: 0,
        upstreamHeaders: upstream.headers,
      });
    },
  });

  // Text models: stream directly
  if (!buffered) {
    return result.toUIMessageStreamResponse();
  }

  // Image/video models: buffer full response, upload to R2, then send clean text
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const fullText = await result.text;

      const convId = body.convId ?? "tmp";

      // Store raw response before URL processing so it can be persisted as backup
      if (body.convId) {
        const pending = pendingUsageByConv.get(body.convId);
        if (pending) pendingUsageByConv.set(body.convId, { ...pending, rawResponse: fullText });
      }

      const cleanText = await processUrls(fullText, convId, mediaType);

      const partId = uid(12);
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: partId });
      writer.write({ type: "text-delta", delta: cleanText, id: partId });
      writer.write({ type: "text-end", id: partId });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
