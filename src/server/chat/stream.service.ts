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
import { assertPromptAllowed } from "./augmentation/moderation.service";
import {
  assembleForStream,
  assembleFromOverrides,
  loadConvContext,
} from "./augmentation/prompt-assembler.service";
import { submitVideoTask } from "./augmentation/task.service";
import {
  formatSearchContext,
  needsWebSearch,
  searchTavily,
} from "./augmentation/tavily.service";
import { pendingUsageByConv, sweepStalePending } from "./message.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StreamBody = {
  model: string;
  messages: Parameters<typeof convertToModelMessages>[0];
  convId?: string | null;
  webSearch?: boolean;
  overrides?: import("@/lib/validation/chat").StreamOverrides;
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

/**
 * Concatenate the last `limit` user messages' text content. Used by the prompt
 * assembler to scan against lorebook keywords.
 */
function collectRecentUserText(
  messages: StreamBody["messages"],
  limit = 6,
): string {
  const out: string[] = [];
  for (let i = messages.length - 1; i >= 0 && out.length < limit; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (!Array.isArray(m.parts)) continue;
    for (const part of m.parts) {
      if (part.type === "text" && typeof part.text === "string") {
        out.push(part.text);
      }
    }
  }
  return out.join("\n");
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

  // Load conversation context up front so per-conversation web-search
  // overrides (engine, contextSize, enabled) can gate the Tavily call below.
  const convCtx = body.convId ? await loadConvContext(body.convId) : null;
  const convWebSearchEnabled = convCtx?.settings.webSearchEnabled ?? false;
  // Web search is a paid-only feature: a guest stream (no convCtx, no auth
  // row) cannot enable it via body, even if the client somehow sends true.
  const effectiveWebSearch =
    convCtx && userId !== "guest"
      ? convWebSearchEnabled
      : userId !== "guest" && !!body.webSearch;

  // Web search via Tavily
  let searchSystemMessage: string | undefined;
  if (effectiveWebSearch) {
    const lastUserText = extractLastUserText(body.messages);
    if (lastUserText) {
      const shouldSearch = await needsWebSearch(apiKey, lastUserText);
      if (shouldSearch) {
        logger.info("Web search triggered", {
          context: "stream.tavily",
          query: lastUserText.slice(0, 100),
          engine: convCtx?.settings.webSearchEngine ?? "auto",
          contextSize: convCtx?.settings.webSearchContextSize ?? "medium",
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

  // Assemble the final system message + sampling params, reusing the ctx we
  // already loaded for web-search gating. When there's no conv ctx (guest
  // convs, or pre-create), fall back to the per-stream overrides the client
  // sends from its jotai defaults.
  const recentUserText = collectRecentUserText(messagesWithPdfText);
  const assembled =
    body.convId && convCtx
      ? await assembleForStream(
          body.convId,
          recentUserText,
          searchSystemMessage,
          convCtx,
        )
      : assembleFromOverrides(body.overrides, searchSystemMessage);

  // Slice messages by chat-memory window (only the user-typed messages count;
  // we never trim system).
  const slicedMessages =
    assembled.chatMemory > 0
      ? messagesWithPdfText.slice(-assembled.chatMemory)
      : messagesWithPdfText;

  const modelMetadata = await getModelMetadata(body.model);
  // Free models often have stale/inflated maxOutputTokens in metadata that
  // exceeds what the upstream actually accepts. Cap to a safe budget.
  // Captured during onFinish, surfaced via messageMetadata so the client can toast.
  const droppedParamsRef: { value: string | null } = { value: null };

  const presetMaxOut = assembled.sampling.maxOutputTokens;
  const effectiveMaxOutputTokens = modelMetadata.isFree
    ? Math.min(
        presetMaxOut ?? modelMetadata.maxOutputTokens ?? FREE_MODEL_OUTPUT_CAP,
        FREE_MODEL_OUTPUT_CAP,
      )
    : presetMaxOut ?? modelMetadata.maxOutputTokens;
  const result = streamText({
    model: provider.chatModel(body.model),
    messages: await convertToModelMessages(slicedMessages),
    system: assembled.system,
    // new-api performs cross-group/key retries; disable SDK retry aggregation
    // so the user sees real upstream errors verbatim.
    maxRetries: 0,
    ...(effectiveMaxOutputTokens && {
      maxOutputTokens: effectiveMaxOutputTokens,
    }),
    ...(assembled.sampling.temperature !== undefined && {
      temperature: assembled.sampling.temperature,
    }),
    ...(assembled.sampling.topP !== undefined && {
      topP: assembled.sampling.topP,
    }),
    ...(assembled.sampling.topK !== undefined && {
      topK: assembled.sampling.topK,
    }),
    ...(assembled.sampling.frequencyPenalty !== undefined && {
      frequencyPenalty: assembled.sampling.frequencyPenalty,
    }),
    ...(assembled.sampling.presencePenalty !== undefined && {
      presencePenalty: assembled.sampling.presencePenalty,
    }),
    // The AI SDK passes unknown sampling fields (min_p, top_a, repetition_penalty)
    // through providerOptions; new-api strips what the upstream doesn't accept.
    providerOptions: {
      openai: {
        ...(assembled.sampling.minP !== undefined && { min_p: assembled.sampling.minP }),
        ...(assembled.sampling.topA !== undefined && { top_a: assembled.sampling.topA }),
        ...(assembled.sampling.repetitionPenalty !== undefined && {
          repetition_penalty: assembled.sampling.repetitionPenalty,
        }),
        ...(assembled.reasoningEffort && {
          reasoning_effort: assembled.reasoningEffort,
        }),
      },
    },
    onFinish: ({ usage, response }) => {
      trackUsage(body.convId, {
        requestId: response.headers?.["x-oneapi-request-id"] ?? undefined,
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        upstreamHeaders: upstream.headers,
      });
      // Capture dropped-params header for the messageMetadata callback below.
      const dropped = response.headers?.["x-newapi-dropped-params"];
      if (typeof dropped === "string" && dropped.length > 0) {
        droppedParamsRef.value = dropped;
      }
    },
  });

  // Text models: stream directly
  if (!buffered) {
    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (part.type === "finish" && droppedParamsRef.value) {
          return { droppedParams: droppedParamsRef.value };
        }
        return undefined;
      },
    });
  }

  // Video/buffered models: buffer, process URLs, then send
  return handleBufferedStream(result, body, mediaType ?? "text");
}
