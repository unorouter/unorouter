import type { ModelType, ProcessedModel } from "@/lib/api/pricing";
import { getPricingSummary } from "@/lib/api/pricing-cache";
import { msg } from "@/lib/config/constants";
import {
  downloadGenerationBytes,
  fetchCheckUpload,
  uploadBase64ToR2,
} from "@/lib/config/r2";
import { base64ToDataUri, uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import {
  buildBody,
  extractResultUris,
  loadRefs,
} from "@/lib/ai/playground/dispatch";
import {
  chooseEndpoint,
  type SyncImageEndpoint,
} from "@/lib/ai/playground/models-dynamic";
import { API_ENDPOINTS } from "@/lib/ai/endpoints";
import { upstreamApiUrl } from "@/server/constants";
import { serverEnv } from "@/server/env";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessageStreamWriter,
} from "ai";
import { submitVideoTask } from "./task.service";
import {
  extractLastUserImageRefs,
  extractLastUserText,
  type StreamMessages,
} from "@/lib/ai/chat/pipeline/transforms";

type MediaStreamBody = {
  model: string;
  messages: StreamMessages;
  convId?: string | null;
  // Billing/routing group sent upstream as X-Group; null/absent == "auto".
  group?: string | null;
};

// Upstream usage shape (OpenAI images + chat). input/output may be absent on some adapters.
type UpstreamUsage = {
  input_tokens?: number;
  output_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

// Finish-metadata for a media turn, mirroring the text path's `messageMetadata` shape so the history
// adapter persists usage/cost + a request-log row identically. Built by media handlers, written by
// writeBufferedMessage. `debug` carries the curl-reproducible upstream target + the real wire body.
function buildMediaMeta(args: {
  model: string;
  usage: UpstreamUsage | undefined;
  cost: number;
  requestId: string | null;
  url: string;
  endpoint: string;
  wireBody: unknown;
  durationMs: number;
}): Record<string, unknown> {
  const inputTokens =
    args.usage?.input_tokens ?? args.usage?.prompt_tokens ?? 0;
  const outputTokens =
    args.usage?.output_tokens ?? args.usage?.completion_tokens ?? 0;
  const meta: Record<string, unknown> = {
    debug: {
      requestBody: args.wireBody,
      assembledSystem: null,
      finalMessages: [],
      responseHeaders: null,
      droppedParams: null,
      requestId: args.requestId,
      url: args.url,
      endpoint: args.endpoint,
    },
  };
  if (inputTokens > 0 || outputTokens > 0 || args.cost > 0) {
    meta.usage = {
      inputTokens,
      outputTokens,
      cost: args.cost,
      durationMs: args.durationMs,
      tokensPerSecond:
        outputTokens > 0 && args.durationMs > 0
          ? outputTokens / (args.durationMs / 1000)
          : undefined,
    };
  }
  return meta;
}

// Per-request fixed price wins for media; else token estimate from catalog prices.
function mediaCost(
  model: ProcessedModel | undefined,
  inputTokens: number,
  outputTokens: number,
): number {
  if (!model || model.isFree) return 0;
  if (model.isFixedPrice) return model.fixedPrice ?? 0;
  return (
    (inputTokens * model.inputPrice + outputTokens * model.outputPrice) /
    1_000_000
  );
}

// Per-request group override header; omitted for null/auto (gateway default).
function groupHeader(group?: string | null): Record<string, string> {
  return group && group !== "auto" ? { "X-Group": group } : {};
}

// Media gen (image especially) can run >100s, longer than Cloudflare's 100s
// origin-response window. Without any byte on the wire, CF kills the browser
// connection with a 524 before the result arrives. Emit a transient
// data-keepalive part on an interval so SSE frames keep flowing and CF's timer
// resets; the client ignores these parts (onData).
const KEEPALIVE_INTERVAL_MS = 20_000;

// One-shot UI-message response: run execute, stream its output. On a throw, emit a data-error part so the adapter persists an error node.
function streamResponse(
  execute: (writer: UIMessageStreamWriter) => Promise<void>,
) {
  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: async ({ writer }) => {
        const heartbeat = setInterval(() => {
          writer.write({ type: "data-keepalive", data: {}, transient: true });
        }, KEEPALIVE_INTERVAL_MS);
        try {
          await execute(writer);
        } catch (err) {
          writer.write({ type: "start" });
          writer.write({ type: "start-step" });
          writer.write({
            type: "data-error",
            data: { message: err instanceof Error ? err.message : String(err) },
          });
          writer.write({ type: "finish-step" });
          writer.write({ type: "finish", finishReason: "error" });
        } finally {
          clearInterval(heartbeat);
        }
      },
    }),
  });
}

// Upstream JSON POST with shared error handling: !ok logs + throws `errKey`.
async function upstreamPost(
  apiKey: string,
  path: string,
  payload: Record<string, unknown>,
  errKey: Parameters<typeof msg>[0],
  context: string,
  group?: string | null,
): Promise<Response> {
  const res = await fetch(`${upstreamApiUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...groupHeader(group),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    logger.error("Upstream media call failed", {
      context,
      model: payload.model,
      error: err.slice(0, 200),
    });
    throw new Error(`${msg(errKey)}: ${err}`);
  }
  return res;
}

// Shared image/video preamble: last user text is the prompt.
// Moderation runs at the source (new-api relay), not here.
function extractMediaPrompt(body: MediaStreamBody): string {
  const prompt = extractLastUserText(body.messages);
  if (!prompt) throw new Error(msg("ERRORS.NO_IMAGE_PROMPT"));
  return prompt;
}

function writeBufferedMessage(
  writer: UIMessageStreamWriter,
  text: string,
  // Optional finish metadata (usage/cost/debug) so media messages persist the same footer + request log as text.
  meta?: Record<string, unknown>,
) {
  const partId = uid(12);
  writer.write({ type: "start" });
  writer.write({ type: "start-step" });
  writer.write({ type: "text-start", id: partId });
  writer.write({ type: "text-delta", delta: text, id: partId });
  writer.write({ type: "text-end", id: partId });
  writer.write({ type: "finish-step" });
  if (meta && Object.keys(meta).length > 0) {
    writer.write({ type: "message-metadata", messageMetadata: meta });
  }
  writer.write({ type: "finish", finishReason: "stop" });
}

const LINK_RE = /(!?)\[([^\]]*)\]\((data:[^)]+|https?:\/\/[^)]+)\)/g;

async function processUrls(
  text: string,
  convId: string,
  mediaType: ModelType,
): Promise<string> {
  const matches = [...text.matchAll(LINK_RE)];
  if (matches.length === 0) return text;
  if (mediaType !== "video" && mediaType !== "image") {
    // Empty-string fallback masks missing host; log for observability.
    logger.warn("processUrls dropping media links for non-media model", {
      context: "stream.urls",
      mediaType,
      linkCount: matches.length,
    });
    return "";
  }

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

// Fallback ref cap when a model declares no maxImageInputs metadata.
const DEFAULT_MAX_CHAT_REFS = 4;

// Dispatch by advertised endpoint: image-generation POSTs /v1/images/generations
// (or multipart /v1/images/edits when refs are attached); openai image models use
// /v1/chat/completions; gemini uses generateContent. Refs are the user's attached
// images for edit/combine turns.
type ImageGenResult = {
  uris: string[];
  usage: UpstreamUsage | undefined;
  requestId: string | null;
  endpointPath: string;
  url: string;
  // Curl-reproducible wire body: the JSON we sent, or a summary for multipart (binary can't be inlined).
  wireBody: unknown;
};

async function generateImage(
  apiKey: string,
  model: string,
  prompt: string,
  endpoint: SyncImageEndpoint,
  refUrls: string[],
  group?: string | null,
): Promise<ImageGenResult> {
  const refs = refUrls.length > 0 ? await loadRefs(refUrls) : [];
  const built = buildBody(endpoint, { model, prompt, refs, n: 1 });
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    ...groupHeader(group),
  };
  if (built.kind === "json") headers["Content-Type"] = "application/json";
  const url = `${upstreamApiUrl}${built.path}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    // multipart: FormData sets its own boundary content-type; json: string body.
    body: built.kind === "json" ? built.body : built.form,
  });
  if (!res.ok) {
    const err = await res.text();
    logger.error("Upstream image call failed", {
      context: "stream.image",
      model,
      endpoint,
      refs: refs.length,
      error: err.slice(0, 200),
    });
    throw new Error(`${msg("ERRORS.IMAGE_GENERATION_FAILED")}: ${err}`);
  }
  const json = (await res.json()) as { usage?: UpstreamUsage };
  const uris = extractResultUris(endpoint, json);
  if (uris.length === 0) {
    throw new Error(msg("ERRORS.IMAGE_GENERATION_FAILED"));
  }
  // multipart edits send binary files; record a JSON-equivalent summary curls can run with public refs.
  const wireBody =
    built.kind === "json"
      ? JSON.parse(built.body)
      : {
          model,
          prompt,
          image_urls: refUrls,
          note: "multipart image[] upload",
        };
  return {
    uris,
    usage: json.usage,
    requestId: res.headers.get("x-oneapi-request-id"),
    endpointPath: built.path,
    url,
    wireBody,
  };
}

export async function handleImageStream(apiKey: string, body: MediaStreamBody) {
  const prompt = extractMediaPrompt(body);
  const model = (await getPricingSummary()).byName.get(body.model);
  const endpoint = chooseEndpoint(model?.endpointTypes ?? []);
  if (!endpoint) throw new Error(msg("ERRORS.IMAGE_GENERATION_FAILED"));
  const maxRefs = model?.metadata.maxImageInputs ?? DEFAULT_MAX_CHAT_REFS;
  const refUrls = extractLastUserImageRefs(body.messages)
    .map((r) => r.url)
    .slice(0, maxRefs);
  return streamResponse(async (writer) => {
    const startedAt = Date.now();
    const result = await generateImage(
      apiKey,
      body.model,
      prompt,
      endpoint,
      refUrls,
      body.group,
    );

    // Stream inline data URLs; client persists base64. Guests never touch Turso/R2: no FK violation, no blocked embeds.
    const dataUrls = await Promise.all(
      result.uris.map(async (img: string) => {
        if (img.startsWith("data:")) return img;
        try {
          const { buffer, mime } = await downloadGenerationBytes(img);
          return base64ToDataUri(buffer.toString("base64"), mime);
        } catch (err) {
          logger.warn("image download to base64 failed", {
            context: "stream.image",
            url: img.slice(0, 100),
            error: String(err),
          });
          return null;
        }
      }),
    );

    const markdown = dataUrls
      .filter((u): u is string => Boolean(u))
      .map((url) => `![image](${url})`)
      .join("\n\n");

    const inputTokens =
      result.usage?.input_tokens ?? result.usage?.prompt_tokens ?? 0;
    const outputTokens =
      result.usage?.output_tokens ?? result.usage?.completion_tokens ?? 0;
    const meta = buildMediaMeta({
      model: body.model,
      usage: result.usage,
      cost: mediaCost(model, inputTokens, outputTokens),
      requestId: result.requestId,
      url: result.url,
      endpoint: result.endpointPath,
      wireBody: result.wireBody,
      durationMs: Date.now() - startedAt,
    });
    writeBufferedMessage(writer, markdown, meta);
  });
}

export async function handleVideoTaskStream(
  apiKey: string,
  body: MediaStreamBody,
) {
  const prompt = extractMediaPrompt(body);
  return streamResponse(async (writer) => {
    const { taskId, status, progress } = await submitVideoTask(
      apiKey,
      body.model,
      prompt,
      body.group,
    );

    // data-task: assistant-ui rewrites to a data/task part; partsToItems persists as `task` for reopen/finalize.
    writer.write({ type: "start" });
    writer.write({ type: "start-step" });
    writer.write({
      type: "data-task",
      data: { taskId, status, progress, model: body.model },
    });
    writer.write({ type: "finish-step" });
    writer.write({ type: "finish", finishReason: "stop" });
  });
}

// TTS models advertise no dedicated endpoint tag; detect speech vs transcription by name to pick the audio path.
const isSttModel = (model: string) =>
  /whisper|transcrib|asr|speech-to-text|stt/i.test(model);

async function generateSpeech(
  apiKey: string,
  model: string,
  input: string,
  group?: string | null,
): Promise<{ dataUri: string; requestId: string | null; wireBody: unknown }> {
  const wireBody = { model, input, voice: "alloy" };
  const res = await upstreamPost(
    apiKey,
    API_ENDPOINTS.audioSpeech,
    wireBody,
    "ERRORS.AUDIO_GENERATION_FAILED",
    "stream.audio",
    group,
  );
  const mime = res.headers.get("content-type") ?? "audio/mpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    dataUri: base64ToDataUri(buf.toString("base64"), mime),
    requestId: res.headers.get("x-oneapi-request-id"),
    wireBody,
  };
}

export async function handleAudioStream(apiKey: string, body: MediaStreamBody) {
  // STT needs an audio input the composer can't yet attach; guide the user. Plain text since it's persisted, not translated.
  if (isSttModel(body.model)) {
    return streamResponse(async (writer) => {
      writeBufferedMessage(
        writer,
        "This is a speech-to-text model. Send it an audio file to transcribe (audio attachments in chat are coming soon). For now, use it via the API at `/v1/audio/transcriptions`.",
      );
    });
  }

  const input = extractLastUserText(body.messages);
  if (!input) throw new Error(msg("ERRORS.NO_AUDIO_PROMPT"));
  const model = (await getPricingSummary()).byName.get(body.model);

  return streamResponse(async (writer) => {
    const startedAt = Date.now();
    const speech = await generateSpeech(apiKey, body.model, input, body.group);
    const meta = buildMediaMeta({
      model: body.model,
      usage: undefined,
      cost: mediaCost(model, 0, 0),
      requestId: speech.requestId,
      url: `${upstreamApiUrl}${API_ENDPOINTS.audioSpeech}`,
      endpoint: API_ENDPOINTS.audioSpeech,
      wireBody: speech.wireBody,
      durationMs: Date.now() - startedAt,
    });
    // data:audio/ markdown renders as <audio>; client persists the base64 into local media like generated images.
    writeBufferedMessage(writer, `![audio](${speech.dataUri})`, meta);
  });
}

export async function generateEmbedding(
  apiKey: string,
  model: string,
  input: string,
  group?: string | null,
): Promise<{
  dims: number;
  vector: number[];
  usage: UpstreamUsage | undefined;
  requestId: string | null;
  wireBody: unknown;
}> {
  const wireBody = { model, input };
  const res = await upstreamPost(
    apiKey,
    API_ENDPOINTS.embeddings,
    wireBody,
    "ERRORS.EMBEDDING_FAILED",
    "stream.embedding",
    group,
  );
  const json = (await res.json()) as {
    data?: { embedding?: number[] }[];
    usage?: UpstreamUsage;
  };
  const vector = json.data?.[0]?.embedding ?? [];
  return {
    dims: vector.length,
    vector,
    usage: json.usage,
    requestId: res.headers.get("x-oneapi-request-id"),
    wireBody,
  };
}

export async function handleEmbeddingStream(
  apiKey: string,
  body: MediaStreamBody,
) {
  const input = extractLastUserText(body.messages);
  if (!input) throw new Error(msg("ERRORS.NO_EMBEDDING_INPUT"));
  const model = (await getPricingSummary()).byName.get(body.model);

  return streamResponse(async (writer) => {
    const startedAt = Date.now();
    const emb = await generateEmbedding(apiKey, body.model, input, body.group);
    const preview = emb.vector.slice(0, 8).map((n) => n.toFixed(6));
    const tail = emb.vector.length > 8 ? ", ..." : "";
    // Plain text (not a t() key): persisted message content, not re-translated.
    const text = [
      `Embedding vector (${emb.dims} dimensions):`,
      "",
      "```json",
      `[${preview.join(", ")}${tail}]`,
      "```",
    ].join("\n");
    const inputTokens =
      emb.usage?.input_tokens ?? emb.usage?.prompt_tokens ?? 0;
    const meta = buildMediaMeta({
      model: body.model,
      usage: emb.usage,
      cost: mediaCost(model, inputTokens, 0),
      requestId: emb.requestId,
      url: `${upstreamApiUrl}${API_ENDPOINTS.embeddings}`,
      endpoint: API_ENDPOINTS.embeddings,
      wireBody: emb.wireBody,
      durationMs: Date.now() - startedAt,
    });
    writeBufferedMessage(writer, text, meta);
  });
}

export function handleBufferedStream(
  result: ReturnType<typeof streamText>,
  body: MediaStreamBody,
  mediaType: ModelType,
  // Caller-synthesized finish metadata, emitted as a chunk so the buffered path persists the same fields as the stream.
  finishMeta?: () => Promise<Record<string, unknown>>,
  // Server-generated message id (keys the server-persisted request log).
  messageId?: string,
) {
  return streamResponse(async (writer) => {
    const fullText = await result.text;
    const reasoning = await result.reasoningText;
    const convId = body.convId ?? `tmp-${uid(8)}`;
    const cleanText = await processUrls(fullText, convId, mediaType);
    const meta = await finishMeta?.();
    const partId = uid(12);
    writer.write(messageId ? { type: "start", messageId } : { type: "start" });
    writer.write({ type: "start-step" });
    // Upstream always streams, so surface reasoning even when the final text is buffered.
    if (reasoning) {
      const reasonId = uid(12);
      writer.write({ type: "reasoning-start", id: reasonId });
      writer.write({ type: "reasoning-delta", delta: reasoning, id: reasonId });
      writer.write({ type: "reasoning-end", id: reasonId });
    }
    writer.write({ type: "text-start", id: partId });
    writer.write({ type: "text-delta", delta: cleanText, id: partId });
    writer.write({ type: "text-end", id: partId });
    writer.write({ type: "finish-step" });
    if (meta && Object.keys(meta).length > 0) {
      writer.write({ type: "message-metadata", messageMetadata: meta });
    }
    writer.write({ type: "finish", finishReason: "stop" });
  });
}
