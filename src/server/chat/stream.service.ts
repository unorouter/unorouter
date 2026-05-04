import { ModelType } from "@/lib/api/pricing";
import { getModelMetadata, isMediaModel } from "@/lib/api/pricing-cache";
import { FREE_MODEL_OUTPUT_CAP, msg } from "@/lib/config/constants";
import { fetchCheckUpload, uploadBase64ToR2 } from "@/lib/config/r2";
import { getDb } from "@/lib/db/client";
import { media } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { imageGenResponseChecker } from "@/lib/validation/media";
import {
  deriveUpstream,
  getProvider,
  upstreamApiUrl,
} from "@/server/constants";
import { serverEnv } from "@/server/env";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessageStreamWriter,
} from "ai";
import { inArray } from "drizzle-orm";
import { pendingUsageByConv, sweepStalePending } from "./message.service";
import { assertPromptAllowed } from "./moderation.service";
import { submitVideoTask } from "./task.service";
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

// Replace PDF `file` parts with a text part populated from the saved
// extracted_text so the model sees the contents without the raw text bleeding
// back into the user's bubble.
async function inlinePdfText(
  messages: StreamBody["messages"],
): Promise<StreamBody["messages"]> {
  const r2Base = serverEnv.r2PublicUrl;
  if (!r2Base) return messages;
  const urlToKey = (url: string) => url.slice(r2Base.length + 1);

  const pdfUrls = new Set<string>();
  for (const m of messages) {
    if (m.role !== "user" || !Array.isArray(m.parts)) continue;
    for (const part of m.parts) {
      if (isPdfFilePart(part) && part.url.startsWith(r2Base)) {
        pdfUrls.add(part.url);
      }
    }
  }
  if (pdfUrls.size === 0) return messages;

  const rows = await getDb()
    .select({ r2Key: media.r2Key, extractedText: media.extractedText })
    .from(media)
    .where(inArray(media.r2Key, [...pdfUrls].map(urlToKey)));
  const textByUrl = new Map<string, string>();
  for (const row of rows) {
    const url = `${r2Base}/${row.r2Key}`;
    if (row.extractedText) {
      textByUrl.set(url, row.extractedText);
    } else {
      // Row exists but extraction yielded nothing. Surface this instead of
      // forwarding a binary PDF URL the model probably can't read.
      throw new Error(msg("ERRORS.PDF_EXTRACTION_FAILED"));
    }
  }
  if (textByUrl.size === 0) return messages;

  return messages.map((m) => {
    if (m.role !== "user" || !Array.isArray(m.parts)) return m;
    const parts = m.parts.flatMap((part) => {
      if (!isPdfFilePart(part)) return [part];
      const text = textByUrl.get(part.url);
      if (!text) return [part];
      const name = part.filename ?? "document.pdf";
      return [
        { type: "text" as const, text: `[Attached PDF "${name}":\n${text}\n]` },
      ];
    });
    return { ...m, parts };
  });
}

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
  sweepStalePending();
  const existing = pendingUsageByConv.get(convId);
  if (existing) {
    logger.warn("Merging concurrent pending usage for conversation", {
      context: "stream.usage",
      convId,
      existingRequestId: existing.requestId,
      newRequestId: usage.requestId,
      ageMs: Date.now() - existing.createdAt,
    });
    pendingUsageByConv.set(convId, {
      requestId: usage.requestId ?? existing.requestId,
      inputTokens: existing.inputTokens + usage.inputTokens,
      outputTokens: existing.outputTokens + usage.outputTokens,
      cost: 0,
      upstreamHeaders: usage.upstreamHeaders,
      rawResponse: usage.rawResponse ?? existing.rawResponse,
      createdAt: Date.now(),
    });
    return;
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
      logger.warn("URL upload failed, keeping original", {
        context: "stream.urls",
        url: url.slice(0, 100),
      });
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
  const res = await fetch(`${upstreamApiUrl}${endpointPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, prompt, n: 1 }),
  });

  if (!res.ok) {
    const err = await res.text();
    logger.error("Image generation failed", {
      context: "stream.image",
      model,
      error: err.slice(0, 200),
    });
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
  userId: number | "guest",
) {
  const prompt = extractLastUserText(body.messages);
  if (!prompt) throw new Error(msg("ERRORS.NO_IMAGE_PROMPT"));

  await assertPromptAllowed({
    prompt,
    userId,
    convId: body.convId,
    model: body.model,
    mediaType: "image",
  });

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
// Video task stream (async task submission)
// ---------------------------------------------------------------------------

async function handleVideoTaskStream(
  apiKey: string,
  body: StreamBody,
  upstreamHeaders: Record<string, string>,
  userId: number | "guest",
) {
  const prompt = extractLastUserText(body.messages);
  if (!prompt) throw new Error(msg("ERRORS.NO_IMAGE_PROMPT"));

  await assertPromptAllowed({
    prompt,
    userId,
    convId: body.convId,
    model: body.model,
    mediaType: "video",
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const { taskId, status, progress } = await submitVideoTask(
        apiKey,
        body.model,
        prompt,
      );

      const sentinel = `TASK_CARD:${JSON.stringify({ taskId, status, progress, model: body.model })}`;

      trackUsage(body.convId, {
        requestId: undefined,
        inputTokens: 0,
        outputTokens: 0,
        upstreamHeaders,
        rawResponse: sentinel,
      });

      writeBufferedMessage(writer, sentinel);
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
  userId: number | "guest",
) {
  const { upstream } = deriveUpstream({ request });
  const { buffered, mediaType } = await isMediaModel(body.model);

  logger.info("Stream started", {
    context: "stream",
    model: body.model,
    mediaType,
    convId: body.convId,
  });

  // Image models: call the images endpoint directly
  if (mediaType === "image") {
    return handleImageStream(apiKey, body, upstream.headers, userId);
  }

  // Video models: submit async task and return task card sentinel
  if (mediaType === "video") {
    return handleVideoTaskStream(apiKey, body, upstream.headers, userId);
  }

  // Web search via Tavily
  let searchSystemMessage: string | undefined;
  if (body.webSearch) {
    const lastUserText = extractLastUserText(body.messages);
    if (lastUserText) {
      const shouldSearch = await needsWebSearch(apiKey, lastUserText);
      if (shouldSearch) {
        logger.info("Web search triggered", {
          context: "stream.tavily",
          query: lastUserText.slice(0, 100),
        });
        const searchResult = await searchTavily(lastUserText);
        if (searchResult && searchResult.results.length > 0) {
          searchSystemMessage = formatSearchContext(searchResult);
        }
      }
    }
  }

  const provider = getProvider(apiKey);
  const messagesWithPdfText = await inlinePdfText(body.messages);
  // Per-model client hints (maxOutputTokens, isReasoning, ...) sourced from
  // new-api-sync's metadata column via /api/pricing. Thinking models need a
  // generous maxOutputTokens because their reasoning_content phase otherwise
  // exhausts the upstream's tiny default budget before any visible content
  // streams. Non-thinking models get no cap here and keep upstream defaults.
  const modelMetadata = await getModelMetadata(body.model);
  // Free models often have stale/inflated maxOutputTokens in metadata that
  // exceeds what the upstream actually accepts (e.g. gemma claims 131072 but
  // serves only 32768 total context). Cap to a safe budget so the request
  // doesn't get rejected with a context-length 400.
  const effectiveMaxOutputTokens = modelMetadata.isFree
    ? Math.min(
        modelMetadata.maxOutputTokens ?? FREE_MODEL_OUTPUT_CAP,
        FREE_MODEL_OUTPUT_CAP,
      )
    : modelMetadata.maxOutputTokens;
  const result = streamText({
    model: provider.chatModel(body.model),
    messages: await convertToModelMessages(messagesWithPdfText),
    system: searchSystemMessage,
    // new-api already performs cross-group/key retries internally. Disable the
    // ai SDK's own retry+aggregation ("Failed after N attempts. Last error: ...")
    // so the user sees the real upstream error verbatim (e.g. data_inspection_failed)
    // instead of the last masked message after the SDK rotated through retries.
    maxRetries: 0,
    ...(effectiveMaxOutputTokens && {
      maxOutputTokens: effectiveMaxOutputTokens,
    }),
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
