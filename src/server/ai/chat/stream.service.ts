import type { ModelType } from "@/lib/api/pricing";
import { getPricingSummary, isMediaModel } from "@/lib/api/pricing-cache";
import { FREE_MODEL_OUTPUT_CAP, msg } from "@/lib/config/constants";
import { fetchCheckUpload, uploadBase64ToR2 } from "@/lib/config/r2";
import { getDb } from "@/lib/db/server/client";
import { media } from "@/lib/db/schema";
import { captureServerEvent } from "@/lib/posthog-server";
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
  buildContextFromClient,
  assembleFromOverrides,
  expandTemplateVars,
  loadConvContext,
  type AssembledSystem,
} from "./augmentation/prompt-assembler.service";
import { submitVideoTask } from "./augmentation/task.service";
import {
  formatSearchContext,
  needsWebSearch,
  searchTavily,
} from "./augmentation/tavily.service";
import { pendingUsageByConv, sweepStalePending } from "./message.service";

type StreamBody = {
  model: string;
  messages: Parameters<typeof convertToModelMessages>[0];
  convId?: string | null;
  webSearch?: boolean;
  overrides?: import("@/lib/validation/chat").StreamOverrides;
  chatContext?: import("@/lib/validation/chat").ChatContext;
};

type UsageInfo = {
  requestId?: string;
  inputTokens: number;
  outputTokens: number;
  upstreamHeaders: Record<string, string>;
  durationMs?: number;
  tokensPerSecond?: number;
};

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

type DepthInjection = {
  text: string;
  depth: number;
  role?: "system" | "user";
};

// SillyTavern depth: counts back from end (0=after last, 1=before last). First-passed wins ties.
function spliceDepthInjections(
  messages: StreamBody["messages"],
  injections: DepthInjection[],
): StreamBody["messages"] {
  if (injections.length === 0) return messages;
  const withIdx = injections
    .map((inj) => {
      const idx = Math.max(0, messages.length - inj.depth);
      return { idx, inj };
    })
    .sort((a, b) => b.idx - a.idx);
  const out = messages.slice();
  for (const { idx, inj } of withIdx) {
    out.splice(idx, 0, {
      role: inj.role ?? "system",
      parts: [{ type: "text", text: inj.text }],
    } as StreamBody["messages"][number]);
  }
  return out;
}

function expandMessageMacros(
  messages: StreamBody["messages"],
  vars: AssembledSystem["vars"],
): StreamBody["messages"] {
  return messages.map((m) => {
    if (!Array.isArray(m.parts)) return m;
    return {
      ...m,
      parts: m.parts.map((p) =>
        p.type === "text" && typeof p.text === "string"
          ? { ...p, text: expandTemplateVars(p.text, vars) }
          : p,
      ),
    };
  });
}

function appendPrefill(
  messages: StreamBody["messages"],
  prefill: string,
): StreamBody["messages"] {
  return [
    ...messages,
    {
      role: "assistant",
      parts: [{ type: "text", text: prefill }],
    } as StreamBody["messages"][number],
  ];
}

// Gemini/some GLM reject mid-conv system role; top-level `system` is unaffected.
function stripSystemRole(
  messages: StreamBody["messages"],
): StreamBody["messages"] {
  return messages.map((m) => {
    if (m.role !== "system") return m;
    const parts = Array.isArray(m.parts)
      ? m.parts.map((p) =>
          p.type === "text" && typeof p.text === "string"
            ? { ...p, text: `[System]: ${p.text}` }
            : p,
        )
      : m.parts;
    return { ...m, role: "user", parts } as StreamBody["messages"][number];
  });
}

// GLM/some Anthropic require strict user/assistant alternation.
function mergeAlternateRoles(
  messages: StreamBody["messages"],
): StreamBody["messages"] {
  if (messages.length < 2) return messages;
  const out: StreamBody["messages"] = [];
  for (const m of messages) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.role === m.role &&
      Array.isArray(prev.parts) &&
      Array.isArray(m.parts)
    ) {
      out[out.length - 1] = {
        ...prev,
        parts: [...prev.parts, ...m.parts],
      } as StreamBody["messages"][number];
    } else {
      out.push(m);
    }
  }
  return out;
}

// Anthropic and Gemini reject convs that start with assistant or system role.
function prependUserStub(
  messages: StreamBody["messages"],
): StreamBody["messages"] {
  if (messages.length === 0) return messages;
  if (messages[0].role === "user") return messages;
  return [
    {
      role: "user",
      parts: [{ type: "text", text: "[Start a new chat]" }],
    } as StreamBody["messages"][number],
    ...messages,
  ];
}

const GEMINI_SAFETY_OFF = [
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
  "HARM_CATEGORY_CIVIC_INTEGRITY",
].map((category) => ({ category, threshold: "OFF" as const }));

function collectRecentUserTexts(
  messages: StreamBody["messages"],
  limit = 32,
): string[] {
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
  return out;
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
      durationMs: usage.durationMs ?? existing.durationMs,
      tokensPerSecond: usage.tokensPerSecond ?? existing.tokensPerSecond,
      upstreamHeaders: usage.upstreamHeaders,
      createdAt: Date.now(),
    });
    return;
  }
  pendingUsageByConv.set(convId, {
    requestId: usage.requestId,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cost: 0,
    durationMs: usage.durationMs,
    tokensPerSecond: usage.tokensPerSecond,
    upstreamHeaders: usage.upstreamHeaders,
    createdAt: Date.now(),
  });
}

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
  userId: number,
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

      if (userId !== 0) {
        trackUsage(body.convId, {
          requestId,
          inputTokens: 0,
          outputTokens: 0,
          upstreamHeaders,
        });
      }

      writeBufferedMessage(writer, markdown);
    },
  });

  return createUIMessageStreamResponse({ stream });
}

async function handleVideoTaskStream(
  apiKey: string,
  body: StreamBody,
  upstreamHeaders: Record<string, string>,
  userId: number,
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

      if (userId !== 0) {
        trackUsage(body.convId, {
          requestId: undefined,
          inputTokens: 0,
          outputTokens: 0,
          upstreamHeaders,
        });
      }

      // data-task: assistant-ui rewrites to {type:"data",name:"task"}; partsToItems persists as `task` for reopen/finalize.
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({
        type: "data-task",
        data: { taskId, status, progress, model: body.model },
      });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function handleBufferedStream(
  result: ReturnType<typeof streamText>,
  body: StreamBody,
  mediaType: ModelType,
) {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const fullText = await result.text;
      const convId = body.convId ?? "tmp";

      const cleanText = await processUrls(fullText, convId, mediaType);
      writeBufferedMessage(writer, cleanText);
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export async function streamChat(
  apiKey: string,
  body: StreamBody,
  request: Request,
  userId: number,
) {
  const { upstream } = await deriveUpstream({ request });
  const { buffered, mediaType } = await isMediaModel(body.model);

  logger.info("Stream started", {
    context: "stream",
    model: body.model,
    mediaType,
    convId: body.convId,
  });

  captureServerEvent({
    event: "chat_stream_started",
    request,
    userId,
    properties: {
      model: body.model,
      media_type: mediaType,
      conv_id: body.convId,
      web_search: !!body.webSearch,
      is_guest: userId === 0,
    },
  });

  if (mediaType === "image") {
    return handleImageStream(apiKey, body, upstream.headers, userId);
  }

  if (mediaType === "video") {
    return handleVideoTaskStream(apiKey, body, upstream.headers, userId);
  }

  // IDB-first: client chatContext avoids Turso RP reads; fall back to Turso for guests/legacy/share-page.
  const convCtx = body.chatContext
    ? buildContextFromClient(body.chatContext)
    : body.convId
      ? await loadConvContext(body.convId)
      : null;
  const convWebSearchEnabled = convCtx?.settings.webSearchEnabled ?? false;
  // Web search is paid-only: a guest stream cannot enable it via body.
  const effectiveWebSearch =
    convCtx && userId !== 0
      ? convWebSearchEnabled
      : userId !== 0 && !!body.webSearch;

  let searchSystemMessage: string | undefined;
  if (effectiveWebSearch) {
    const lastUserText = extractLastUserText(body.messages);
    if (lastUserText) {
      const shouldSearch = await needsWebSearch(apiKey, lastUserText);
      if (shouldSearch) {
        const engine = convCtx?.settings.webSearchEngine ?? "auto";
        const contextSize = convCtx?.settings.webSearchContextSize ?? "medium";
        logger.info("Web search triggered", {
          context: "stream.tavily",
          query: lastUserText.slice(0, 100),
          engine,
          contextSize,
        });
        const searchResult = await searchTavily(lastUserText);
        captureServerEvent({
          event: "chat_web_search_executed",
          request,
          userId,
          properties: {
            engine,
            context_size: contextSize,
            result_count: searchResult?.results.length ?? 0,
            had_results: (searchResult?.results.length ?? 0) > 0,
          },
        });
        if (searchResult && searchResult.results.length > 0) {
          searchSystemMessage = formatSearchContext(searchResult);
        }
      }
    }
  }

  const provider = getProvider(apiKey);
  const messagesWithPdfText = await inlinePdfText(body.messages);

  const recentUserTexts = collectRecentUserTexts(messagesWithPdfText);
  const assembled =
    body.convId && convCtx
      ? await assembleForStream(
          body.convId,
          recentUserTexts,
          searchSystemMessage,
          convCtx,
        )
      : assembleFromOverrides(body.overrides, searchSystemMessage);

  const slicedMessages =
    assembled.chatMemory > 0
      ? messagesWithPdfText.slice(-assembled.chatMemory)
      : messagesWithPdfText;

  const depthInjections = [
    ...assembled.atDepthEntries,
    ...(assembled.authorNote ? [assembled.authorNote] : []),
  ];
  const splicedMessages =
    depthInjections.length > 0
      ? spliceDepthInjections(slicedMessages, depthInjections)
      : slicedMessages;
  let processedMessages = expandMessageMacros(splicedMessages, assembled.vars);

  // ORDER LOCKED, do not reshuffle:
  //  1. noSystemRole BEFORE merge: stripped system-as-user must be eligible
  //     to collapse with an adjacent user during merge.
  //  2. prefill BEFORE merge: prefill is assistant role; if user ended on
  //     assistant, mergeAlternateRoles will collapse them.
  //     skipPrefillIfLastIsAssistant opts out.
  //  3. mergeAlternateRoles AFTER prefill: output strictly
  //     user/assistant/user/assistant.
  //  4. prependUserStub LAST so merge cannot fold the stub into a following
  //     user message.
  if (assembled.flags.noSystemRole) {
    processedMessages = stripSystemRole(processedMessages);
  }
  const lastIsAssistant =
    processedMessages[processedMessages.length - 1]?.role === "assistant";
  const prefillBlocked =
    assembled.flags.skipPrefillIfLastIsAssistant &&
    assembled.flags.forceAlternateRoles &&
    lastIsAssistant;
  if (assembled.prefill && !prefillBlocked) {
    processedMessages = appendPrefill(processedMessages, assembled.prefill);
  }
  if (assembled.flags.forceAlternateRoles) {
    processedMessages = mergeAlternateRoles(processedMessages);
  }
  if (assembled.flags.mustStartWithUserInput) {
    processedMessages = prependUserStub(processedMessages);
  }
  const messagesForUpstream = processedMessages;

  const modelInfo = (await getPricingSummary()).models.find(
    (m) => m.name === body.model,
  );
  // Free models often advertise inflated maxOutputTokens; cap to a safe budget.
  const droppedParamsRef: { value: string | null } = { value: null };
  const usageRef: {
    value: {
      inputTokens: number;
      outputTokens: number;
      cost: number;
      durationMs: number;
      tokensPerSecond?: number;
    } | null;
  } = { value: null };

  const presetMaxOut = assembled.sampling.maxOutputTokens;
  const modelMaxOut = modelInfo?.metadata.maxOutputTokens;
  const effectiveMaxOutputTokens = modelInfo?.isFree
    ? Math.min(
        presetMaxOut ?? modelMaxOut ?? FREE_MODEL_OUTPUT_CAP,
        FREE_MODEL_OUTPUT_CAP,
      )
    : (presetMaxOut ?? modelMaxOut);
  const streamStartedAt = Date.now();
  const result = streamText({
    model: provider.chatModel(body.model),
    messages: await convertToModelMessages(messagesForUpstream),
    system: assembled.system,
    // new-api performs cross-group/key retries; disable SDK aggregation so
    // the user sees real upstream errors verbatim.
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
    // extraBody first: sliders/reasoning win on key collision.
    providerOptions: {
      openai: {
        ...(assembled.extraBody ?? {}),
        ...(assembled.sampling.minP !== undefined && {
          min_p: assembled.sampling.minP,
        }),
        ...(assembled.sampling.topA !== undefined && {
          top_a: assembled.sampling.topA,
        }),
        ...(assembled.sampling.repetitionPenalty !== undefined && {
          repetition_penalty: assembled.sampling.repetitionPenalty,
        }),
        ...(assembled.reasoningEffort && {
          reasoning_effort: assembled.reasoningEffort,
        }),
        // Gemini-only: threshold=OFF (stronger than BLOCK_NONE); no-op elsewhere.
        ...(assembled.flags.geminiBlockOff && {
          safetySettings: GEMINI_SAFETY_OFF,
        }),
      },
    },
    onFinish: ({ usage, response }) => {
      const durationMs = Date.now() - streamStartedAt;
      const outputTokens = usage.outputTokens ?? 0;
      const inputTokens = usage.inputTokens ?? 0;
      const tokensPerSecond =
        outputTokens > 0 && durationMs > 0
          ? outputTokens / (durationMs / 1000)
          : undefined;
      const requestId = response.headers?.["x-oneapi-request-id"] ?? undefined;
      if (userId !== 0) {
        trackUsage(body.convId, {
          requestId,
          inputTokens,
          outputTokens,
          upstreamHeaders: upstream.headers,
          durationMs,
          tokensPerSecond,
        });
      }
      // Cost backfilled later from upstream headers; client needs tokens now for its local row.
      usageRef.value = {
        inputTokens,
        outputTokens,
        cost: 0,
        durationMs,
        tokensPerSecond,
      };
      const dropped = response.headers?.["x-newapi-dropped-params"];
      if (typeof dropped === "string" && dropped.length > 0) {
        droppedParamsRef.value = dropped;
      }
      captureServerEvent({
        event: "chat_stream_completed",
        request,
        userId,
        properties: {
          model: body.model,
          duration_ms: durationMs,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          tokens_per_second: tokensPerSecond,
          web_search: effectiveWebSearch,
          has_dropped_params: !!droppedParamsRef.value,
          is_guest: userId === 0,
          request_id: requestId,
        },
      });
    },
    onError: ({ error }) => {
      captureServerEvent({
        event: "chat_stream_failed",
        request,
        userId,
        properties: {
          model: body.model,
          duration_ms: Date.now() - streamStartedAt,
          error_class:
            error instanceof Error ? error.constructor.name : "Unknown",
          error_message:
            error instanceof Error
              ? error.message.slice(0, 200)
              : String(error).slice(0, 200),
          is_guest: userId === 0,
        },
      });
    },
  });

  const userOptedOutOfStreaming = !assembled.streamingEnabled;

  if (!buffered && !userOptedOutOfStreaming) {
    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        if (part.type === "finish") {
          const meta: Record<string, unknown> = {};
          if (droppedParamsRef.value)
            meta.droppedParams = droppedParamsRef.value;
          // streamText.onFinish races with UI stream finish; read usage off
          // the part directly so the message-metadata frame ships tokens.
          const total = part.totalUsage;
          const durationMs = Date.now() - streamStartedAt;
          const inputTokens = total?.inputTokens ?? 0;
          const outputTokens = total?.outputTokens ?? 0;
          const tokensPerSecond =
            outputTokens > 0 && durationMs > 0
              ? outputTokens / (durationMs / 1000)
              : undefined;
          if (inputTokens > 0 || outputTokens > 0) {
            meta.usage = {
              inputTokens,
              outputTokens,
              cost: 0,
              durationMs,
              tokensPerSecond,
            };
          }
          return Object.keys(meta).length > 0 ? meta : undefined;
        }
        return undefined;
      },
    });
  }

  return handleBufferedStream(result, body, mediaType ?? "text");
}
