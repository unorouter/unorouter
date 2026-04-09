import { ModelType } from "@/lib/api/pricing";
import { isMediaModel } from "@/lib/api/pricing-cache";
import { msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { fetchCheckUpload, uploadBase64ToR2 } from "@/lib/config/r2";
import { uid } from "@/lib/utils/base";
import { imageGenResponseChecker } from "@/lib/validation/media";
import { deriveUpstream, getProvider } from "@/server/constants";
import { serverEnv } from "@/server/env";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessageStreamWriter,
} from "ai";
import { logger } from "@/lib/utils/logger";
import { pendingUsageByConv } from "./message.service";
import {
  formatSearchContext,
  needsWebSearch,
  searchTavily,
} from "./tavily.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StreamBody = {
  model: string;
  messages: Parameters<typeof convertToModelMessages>[0];
  convId?: string | null;
  webSearch?: boolean;
};

type UsageInfo = {
  requestId?: string;
  inputTokens: number;
  outputTokens: number;
  upstreamHeaders: Record<string, string>;
  rawResponse?: string;
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function extractLastUserText(messages: StreamBody["messages"]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    if (Array.isArray(msg.parts)) {
      for (const part of msg.parts) {
        if (
          part.type === "text" &&
          typeof part.text === "string" &&
          part.text.trim()
        ) {
          return part.text.trim();
        }
      }
    }
  }
  return null;
}

function writeBufferedMessage(writer: UIMessageStreamWriter, text: string) {
  const partId = uid(12);
  writer.write({ type: "start" });
  writer.write({ type: "start-step" });
  writer.write({ type: "text-start", id: partId });
  writer.write({ type: "text-delta", delta: text, id: partId });
  writer.write({ type: "text-end", id: partId });
  writer.write({ type: "finish-step" });
  writer.write({ type: "finish", finishReason: "stop" });
}

function trackUsage(convId: string | null | undefined, usage: UsageInfo) {
  if (!convId) return;
  const existing = pendingUsageByConv.get(convId);
  if (existing) {
    logger.warn("Overwriting pending usage for conversation", {
      context: "stream.usage",
      convId,
      existingRequestId: existing.requestId,
      newRequestId: usage.requestId,
      ageMs: Date.now() - existing.createdAt,
    });
  }
  pendingUsageByConv.set(convId, {
    requestId: usage.requestId,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cost: 0,
    upstreamHeaders: usage.upstreamHeaders,
    rawResponse: usage.rawResponse,
    createdAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// URL processing (mirrors cleanImageParts in message.service.ts)
// ---------------------------------------------------------------------------

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

    const r2Url = await fetchCheckUpload(
      url,
      convId,
      groupKey,
      mediaType === "video",
    );

    if (!r2Url) {
      logger.warn("URL upload failed, keeping original", { context: "stream.urls", url: url.slice(0, 100) });
      return `![${alt}](${url})`;
    }
    return `![${alt}](${r2Url})`;
  };

  return (await Promise.all(matches.map(process))).filter(Boolean).join("\n\n");
}

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

async function generateImage(
  apiKey: string,
  model: string,
  prompt: string,
  endpointPath: string,
): Promise<{ images: string[]; isBase64: boolean; requestId?: string }> {
  const res = await fetch(`${env.apiUrl}${endpointPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, prompt, n: 1 }),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error("Image generation failed", { context: "stream.image", model, error: err.slice(0, 200) });
    throw new Error(`${msg("ERRORS.IMAGE_GENERATION_FAILED")}: ${err}`);
  }

  const raw = await res.json();
  if (!imageGenResponseChecker.Check(raw)) {
    throw new Error(msg("ERRORS.IMAGE_GENERATION_FAILED"));
  }
  const json = raw;
  const requestId = res.headers.get("x-oneapi-request-id") ?? undefined;

  // Prefer url, fall back to b64_json
  const urls = json.data
    .map((d) => d.url)
    .filter((u): u is string => Boolean(u));
  if (urls.length > 0) return { images: urls, isBase64: false, requestId };

  const b64s = json.data
    .map((d) => d.b64_json)
    .filter((b): b is string => Boolean(b));
  return { images: b64s, isBase64: true, requestId };
}

async function handleImageStream(
  apiKey: string,
  body: StreamBody,
  upstreamHeaders: Record<string, string>,
) {
  const prompt = extractLastUserText(body.messages);
  if (!prompt) throw new Error(msg("ERRORS.NO_IMAGE_PROMPT"));

  const { endpointPath } = await isMediaModel(body.model);
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const { images, isBase64, requestId } = await generateImage(
        apiKey,
        body.model,
        prompt,
        endpointPath!,
      );

      const convId = body.convId ?? "tmp";
      const groupKey = uid(8);
      const r2Urls = await Promise.all(
        images.map((img: string) =>
          isBase64
            ? uploadBase64ToR2(`data:image/png;base64,${img}`, convId, groupKey)
            : fetchCheckUpload(img, convId, groupKey, false),
        ),
      );

      const markdown = r2Urls
        .filter(Boolean)
        .map((url: string | null) => `![image](${url})`)
        .join("\n\n");

      trackUsage(body.convId, {
        requestId,
        inputTokens: 0,
        outputTokens: 0,
        upstreamHeaders,
        rawResponse: markdown,
      });

      writeBufferedMessage(writer, markdown);
    },
  });

  return createUIMessageStreamResponse({ stream });
}

// ---------------------------------------------------------------------------
// Video / buffered media stream
// ---------------------------------------------------------------------------

function handleBufferedStream(
  result: ReturnType<typeof streamText>,
  body: StreamBody,
  mediaType: ModelType,
) {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const fullText = await result.text;
      const convId = body.convId ?? "tmp";

      // Store raw response before URL processing so it can be persisted as backup
      const pending = body.convId
        ? pendingUsageByConv.get(body.convId)
        : undefined;
      if (pending && body.convId) {
        pendingUsageByConv.set(body.convId, {
          ...pending,
          rawResponse: fullText,
        });
      }

      const cleanText = await processUrls(fullText, convId, mediaType);
      writeBufferedMessage(writer, cleanText);
    },
  });

  return createUIMessageStreamResponse({ stream });
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function streamChat(
  apiKey: string,
  body: StreamBody,
  request: Request,
) {
  const { upstream } = deriveUpstream({ request });
  const { buffered, mediaType } = await isMediaModel(body.model);

  logger.info("Stream started", { context: "stream", model: body.model, mediaType, convId: body.convId });

  // Image models: call the images endpoint directly
  if (mediaType === "image") {
    return handleImageStream(apiKey, body, upstream.headers);
  }

  // Web search via Tavily
  let searchSystemMessage: string | undefined;
  if (body.webSearch) {
    const lastUserText = extractLastUserText(body.messages);
    if (lastUserText) {
      const shouldSearch = await needsWebSearch(apiKey, lastUserText);
      if (shouldSearch) {
        logger.info("Web search triggered", { context: "stream.tavily", query: lastUserText.slice(0, 100) });
        const searchResult = await searchTavily(lastUserText);
        if (searchResult && searchResult.results.length > 0) {
          searchSystemMessage = formatSearchContext(searchResult);
        }
      }
    }
  }

  const provider = getProvider(apiKey);
  const result = streamText({
    model: provider.chatModel(body.model),
    messages: await convertToModelMessages(body.messages),
    system: searchSystemMessage,
    onFinish: ({ usage, response }) => {
      trackUsage(body.convId, {
        requestId: response.headers?.["x-oneapi-request-id"] ?? undefined,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        upstreamHeaders: upstream.headers,
      });
    },
  });

  // Text models: stream directly
  if (!buffered) return result.toUIMessageStreamResponse();

  // Video/buffered models: buffer, process URLs, then send
  return handleBufferedStream(result, body, mediaType ?? "text");
}
