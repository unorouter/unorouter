import { deriveUpstream, getProvider } from "@/server/constants";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";
import { pendingUsageByConv } from "./message.service";
import { isMediaModel } from "@/lib/api/pricing-cache";
import { downloadAndUpload, uploadBase64ToR2 } from "@/lib/config/r2";
import { uid } from "@/lib/utils/base";
import { serverEnv } from "@/server/env";

// ---------------------------------------------------------------------------
// Image processing (mirrors cleanImageParts in message.service.ts)
// ---------------------------------------------------------------------------

const IMAGE_MD_RE = /!\[([^\]]*)\]\((data:[^)]+|https?:\/\/[^)]+)\)/g;

async function processImageText(
  text: string,
  convId: string,
  groupKey: string,
): Promise<string> {
  const r2Domain = serverEnv.r2PublicUrl ?? "";
  const matches = [...text.matchAll(IMAGE_MD_RE)];
  if (matches.length === 0) return text;

  const imageMarkdowns: string[] = [];
  for (const [, alt, url] of matches) {
    try {
      let r2Url: string;
      if (url.startsWith("data:")) {
        r2Url = await uploadBase64ToR2(url, convId, groupKey);
      } else if (r2Domain && !url.startsWith(r2Domain)) {
        r2Url = await downloadAndUpload(url, convId, groupKey);
      } else {
        r2Url = url;
      }
      imageMarkdowns.push(`![${alt}](${r2Url})`);
    } catch {
      imageMarkdowns.push(`![${alt}](${url})`);
    }
  }
  return imageMarkdowns.join("\n\n");
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
  const buffered = await isMediaModel(body.model);

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
      const groupKey = uid(8);
      const cleanText = await processImageText(fullText, convId, groupKey);

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
