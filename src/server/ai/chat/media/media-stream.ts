import type { ModelType } from "@/lib/api/pricing";
import type { PricingCatalogDetail } from "@/openapi";
import { getModelByName } from "@/server/models/pricing/pricing.service";
import { msg } from "@/lib/config/constants";
import { downloadGenerationBytes } from "@/lib/config/safe-fetch";
import { base64ToDataUri, parseDataUri, uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import {
  buildBody,
  extractResultUris,
  loadRefs,
} from "@/lib/ai/image/dispatch";
import { type SyncImageEndpoint } from "@/lib/ai/image/dispatch";
import { API_ENDPOINTS } from "@/lib/ai/endpoints";
import { digErrorMessage } from "@/lib/api/video-task";
import { groupHeader, upstreamApiUrl } from "@/server/constants";
import {
  postImageRequest,
  probeImageSize,
  UpstreamImageError,
  type UpstreamImageResponse,
} from "@/server/ai/image/upstream";
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
  group?: string | null;
};

type UpstreamUsage = {
  input_tokens?: number;
  output_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
};

function buildMediaMeta(args: {
  model: PricingCatalogDetail | undefined;
  usage: UpstreamUsage | undefined;
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
  const cost = mediaCost(args.model, inputTokens, outputTokens);
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
  if (inputTokens > 0 || outputTokens > 0 || cost > 0) {
    meta.usage = {
      inputTokens,
      outputTokens,
      cost,
      durationMs: args.durationMs,
      tokensPerSecond:
        outputTokens > 0 && args.durationMs > 0
          ? outputTokens / (args.durationMs / 1000)
          : undefined,
    };
  }
  return meta;
}

function mediaCost(
  model: PricingCatalogDetail | undefined,
  inputTokens: number,
  outputTokens: number,
): number {
  if (!model || model.is_free) return 0;
  if (model.is_fixed_price) return model.fixed_price ?? 0;
  return (
    (inputTokens * model.input_price + outputTokens * model.output_price) /
    1_000_000
  );
}

const KEEPALIVE_INTERVAL_MS = 20_000;

function upstreamErrorMessage(raw: string, fallback: string): string {
  const text = raw.trim();
  if (!text) return fallback;
  try {
    return digErrorMessage(JSON.parse(text)) ?? text;
  } catch {
    return text;
  }
}

// resolveThrownMessage turns anything thrown in a media handler (Error, the
// customFetch {status, data} object, or a raw value) into a readable string.
function resolveThrownMessage(err: unknown, fallback: string): string {
  const dug = digErrorMessage(err);
  if (dug) return dug;
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

function streamResponse(
  execute: (writer: UIMessageStreamWriter) => Promise<void>,
  model?: string,
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
            data: {
              message: resolveThrownMessage(
                err,
                msg("ERRORS.UNEXPECTED_ERROR"),
              ),
              ...(model ? { model } : {}),
            },
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
    throw new Error(upstreamErrorMessage(err, msg(errKey)));
  }
  return res;
}

function extractMediaPrompt(body: MediaStreamBody): string {
  const prompt = extractLastUserText(body.messages);
  if (!prompt) throw new Error(msg("ERRORS.NO_IMAGE_PROMPT"));
  return prompt;
}

function writeBufferedMessage(
  writer: UIMessageStreamWriter,
  text: string,
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

// Async media (video, and AI Horde images) resolves by client polling, so the
// stream ends on a task card rather than content.
function writeTaskCard(
  writer: UIMessageStreamWriter,
  task: { taskId: string; status: string; progress: string },
  model: string,
) {
  writer.write({ type: "start" });
  writer.write({ type: "start-step" });
  writer.write({ type: "data-task", data: { ...task, model } });
  writer.write({ type: "finish-step" });
  writer.write({ type: "finish", finishReason: "stop" });
}

const LINK_RE = /(!?)\[([^\]]*)\]\((data:[^)]+|https?:\/\/[^)]+)\)/g;

function processUrls(text: string, mediaType: ModelType): string {
  const matches = [...text.matchAll(LINK_RE)];
  if (matches.length === 0) return text;
  if (mediaType !== "video" && mediaType !== "image") {
    logger.warn("processUrls dropping media links for non-media model", {
      context: "stream.urls",
      mediaType,
      linkCount: matches.length,
    });
    return "";
  }

  // Media links are no longer re-hosted (R2 removed): data: URIs inline as-is,
  // remote URLs pass through to the original upstream location.
  return matches
    .map(([, , alt, url]) => `![${alt}](${url})`)
    .filter(Boolean)
    .join("\n\n");
}

const DEFAULT_MAX_CHAT_REFS = 4;

type ImageGenResult = {
  uris: string[];
  usage: UpstreamUsage | undefined;
  requestId: string | null;
  endpointPath: string;
  url: string;
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
  let res: UpstreamImageResponse;
  try {
    res = await postImageRequest(built, apiKey, groupHeader(group));
  } catch (err) {
    if (err instanceof UpstreamImageError) {
      logger.error("Upstream image call failed", {
        context: "stream.image",
        model,
        endpoint,
        refs: refs.length,
        error: err.body.slice(0, 200),
      });
      // The chat stream displays a plain message, not the raw JSON body.
      throw new Error(
        upstreamErrorMessage(err.body, msg("ERRORS.IMAGE_GENERATION_FAILED")),
      );
    }
    throw err;
  }
  const json = res.payload as { usage?: UpstreamUsage };
  const uris = extractResultUris(endpoint, json);
  if (uris.length === 0) {
    throw new Error(msg("ERRORS.IMAGE_GENERATION_FAILED"));
  }
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
    requestId: res.requestId,
    endpointPath: built.path,
    url: `${upstreamApiUrl}${built.path}`,
    wireBody,
  };
}

// Image models served by an ASYNC task API (AI Horde) have no sync image
// endpoint; they submit + poll through the same /v1/videos task flow as video.
function isImageTaskModel(endpointTypes: string[] | undefined): boolean {
  return (endpointTypes ?? []).includes("aihorde");
}

export async function handleImageStream(apiKey: string, body: MediaStreamBody) {
  const model = (await getModelByName(body.model)) ?? undefined;

  // Async image-task models (AI Horde): submit + emit a task card, client polls.
  if (isImageTaskModel(model?.supported_endpoint_types)) {
    return streamResponse(async (writer) => {
      const prompt = extractMediaPrompt(body);
      const { taskId, status, progress } = await submitVideoTask(
        apiKey,
        body.model,
        prompt,
        body.group,
      );
      writeTaskCard(writer, { taskId, status, progress }, body.model);
    }, body.model);
  }

  const endpoint = model?.metadata?.imageParams?.endpoint as
    SyncImageEndpoint | undefined;
  const maxRefs =
    model?.metadata?.imageParams?.maxReferenceImages || DEFAULT_MAX_CHAT_REFS;
  const refUrls = extractLastUserImageRefs(body.messages)
    .map((r) => r.url)
    .slice(0, maxRefs);
  return streamResponse(async (writer) => {
    const prompt = extractMediaPrompt(body);
    if (!endpoint) throw new Error(msg("ERRORS.IMAGE_GENERATION_FAILED"));
    const startedAt = Date.now();
    const result = await generateImage(
      apiKey,
      body.model,
      prompt,
      endpoint,
      refUrls,
      body.group,
    );

    // The generated bytes must NOT go into the message text. A data: URI for a
    // multi-megabyte PNG streamed as message content re-runs the markdown
    // pipeline over the whole base64 string on every render, which locks the
    // page and overflows the stack ("Maximum call stack size exceeded") - the
    // user is billed for an image they never see. Ride the bytes on finish-meta
    // `inlayMedia` (the client persists them to the local media table) and put
    // only a short `{{inlay::id}}` token in the text, exactly like the
    // illustrator path.
    const inlayMedia = (
      await Promise.all(
        result.uris.map(async (img: string) => {
          try {
            const parsed = img.startsWith("data:")
              ? parseDataUri(img)
              : await (async () => {
                  const { buffer, mime } = await downloadGenerationBytes(img);
                  return { base64: buffer.toString("base64"), mime };
                })();
            if (!parsed) return null;
            const size = await probeImageSize(
              Buffer.from(parsed.base64, "base64"),
            );
            return {
              id: uid(16),
              dataBase64: parsed.base64,
              mimeType: parsed.mime,
              sizeBytes: Math.floor((parsed.base64.length * 3) / 4),
              width: size.width,
              height: size.height,
            };
          } catch (err) {
            logger.warn("image download to base64 failed", {
              context: "stream.image",
              url: img.slice(0, 100),
              error: String(err),
            });
            return null;
          }
        }),
      )
    ).filter((m): m is NonNullable<typeof m> => Boolean(m));

    if (inlayMedia.length === 0) {
      throw new Error(msg("ERRORS.IMAGE_GENERATION_FAILED"));
    }

    const markdown = inlayMedia.map((m) => `{{inlay::${m.id}}}`).join("\n\n");

    const meta = buildMediaMeta({
      model,
      usage: result.usage,
      requestId: result.requestId,
      url: result.url,
      endpoint: result.endpointPath,
      wireBody: result.wireBody,
      durationMs: Date.now() - startedAt,
    });
    writeBufferedMessage(writer, markdown, { ...meta, inlayMedia });
  }, body.model);
}

// Image-to-video (and frame/reference variants) require a source image; DashScope rejects the task
// with "Field required: input.media" / "img_url must be set" otherwise.
const isImageInputVideoModel = (model: string) =>
  /i2v|kf2v|r2v|image-to-video/i.test(model);

export async function handleVideoTaskStream(
  apiKey: string,
  body: MediaStreamBody,
) {
  const isImageInput = isImageInputVideoModel(body.model);
  return streamResponse(async (writer) => {
    const refs = extractLastUserImageRefs(body.messages);
    // R2 removed: an image-to-video reference is passed through as-is. A data:
    // URI can't be fetched by the upstream render worker, so i2v needs an http
    // reference; the previous R2 rehost of data: refs is gone.
    const image: string | undefined = refs[0]?.url;
    if (!image && isImageInput) {
      throw new Error(msg("ERRORS.VIDEO_IMAGE_REQUIRED"));
    }
    // For image-to-video the image is the input, so the text prompt is optional.
    const prompt = isImageInput
      ? (extractLastUserText(body.messages) ?? "")
      : extractMediaPrompt(body);
    const { taskId, status, progress } = await submitVideoTask(
      apiKey,
      body.model,
      prompt,
      body.group,
      image,
    );

    writeTaskCard(writer, { taskId, status, progress }, body.model);
  }, body.model);
}

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
  if (isSttModel(body.model)) {
    return streamResponse(async (writer) => {
      writeBufferedMessage(
        writer,
        "This is a speech-to-text model. Send it an audio file to transcribe (audio attachments in chat are coming soon). For now, use it via the API at `/v1/audio/transcriptions`.",
      );
    }, body.model);
  }

  const model = (await getModelByName(body.model)) ?? undefined;

  return streamResponse(async (writer) => {
    const input = extractLastUserText(body.messages);
    if (!input) throw new Error(msg("ERRORS.NO_AUDIO_PROMPT"));
    const startedAt = Date.now();
    const speech = await generateSpeech(apiKey, body.model, input, body.group);
    const meta = buildMediaMeta({
      model,
      usage: undefined,
      requestId: speech.requestId,
      url: `${upstreamApiUrl}${API_ENDPOINTS.audioSpeech}`,
      endpoint: API_ENDPOINTS.audioSpeech,
      wireBody: speech.wireBody,
      durationMs: Date.now() - startedAt,
    });
    writeBufferedMessage(writer, `![audio](${speech.dataUri})`, meta);
  }, body.model);
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
  const model = (await getModelByName(body.model)) ?? undefined;

  return streamResponse(async (writer) => {
    const input = extractLastUserText(body.messages);
    if (!input) throw new Error(msg("ERRORS.NO_EMBEDDING_INPUT"));
    const startedAt = Date.now();
    const emb = await generateEmbedding(apiKey, body.model, input, body.group);
    const preview = emb.vector.slice(0, 8).map((n) => n.toFixed(6));
    const tail = emb.vector.length > 8 ? ", ..." : "";
    const text = [
      `Embedding vector (${emb.dims} dimensions):`,
      "",
      "```json",
      `[${preview.join(", ")}${tail}]`,
      "```",
    ].join("\n");
    const meta = buildMediaMeta({
      model,
      usage: emb.usage,
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
  finishMeta?: () => Promise<Record<string, unknown>>,
  messageId?: string,
) {
  return streamResponse(async (writer) => {
    const fullText = await result.text;
    const reasoning = await result.reasoningText;
    const cleanText = processUrls(fullText, mediaType);
    const meta = await finishMeta?.();
    const partId = uid(12);
    writer.write(messageId ? { type: "start", messageId } : { type: "start" });
    writer.write({ type: "start-step" });
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
