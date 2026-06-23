import type { ModelType } from "@/lib/api/pricing";
import { getPricingSummary } from "@/lib/api/pricing-cache";
import { msg } from "@/lib/config/constants";
import {
  downloadGenerationBytes,
  fetchCheckUpload,
  uploadBase64ToR2,
} from "@/lib/config/r2";
import { base64ToDataUri, uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { buildBody, extractResultUris } from "@/lib/ai/playground/dispatch";
import {
  chooseEndpoint,
  type SyncImageEndpoint,
} from "@/lib/ai/playground/models-dynamic";
import { upstreamApiUrl } from "@/server/constants";
import { serverEnv } from "@/server/env";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessageStreamWriter,
} from "ai";
import { assertPromptAllowed } from "./moderation.service";
import { submitVideoTask } from "./task.service";
import {
  extractLastUserText,
  type StreamMessages,
} from "../pipeline/transforms";

type MediaStreamBody = {
  model: string;
  messages: StreamMessages;
  convId?: string | null;
  // Billing/routing group sent upstream as X-Group; null/absent == "auto".
  group?: string | null;
};

// Per-request group override header; omitted for null/auto (gateway default).
function groupHeader(group?: string | null): Record<string, string> {
  return group && group !== "auto" ? { "X-Group": group } : {};
}

// One-shot UI-message response: run execute, stream its output. On a throw, emit a data-error part so the adapter persists an error node.
function streamResponse(
  execute: (writer: UIMessageStreamWriter) => Promise<void>,
) {
  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: async ({ writer }) => {
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

// Shared image/video preamble: last user text is the prompt; moderation gate.
async function moderatedPrompt(
  body: MediaStreamBody,
  userId: number,
  mediaType: "image" | "video",
): Promise<string> {
  const prompt = extractLastUserText(body.messages);
  if (!prompt) throw new Error(msg("ERRORS.NO_IMAGE_PROMPT"));
  await assertPromptAllowed({
    prompt,
    userId,
    convId: body.convId,
    model: body.model,
    mediaType,
  });
  return prompt;
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

// Dispatch by advertised endpoint: image-generation POSTs /v1/images/generations; openai-only image models MUST use /v1/chat/completions.
async function generateImage(
  apiKey: string,
  model: string,
  prompt: string,
  endpoint: SyncImageEndpoint,
  group?: string | null,
): Promise<string[]> {
  const built = buildBody(endpoint, { model, prompt, refs: [], n: 1 });
  if (built.kind !== "json") {
    throw new Error(msg("ERRORS.IMAGE_GENERATION_FAILED"));
  }
  const res = await fetch(`${upstreamApiUrl}${built.path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...groupHeader(group),
    },
    body: built.body,
  });
  if (!res.ok) {
    const err = await res.text();
    logger.error("Upstream image call failed", {
      context: "stream.image",
      model,
      endpoint,
      error: err.slice(0, 200),
    });
    throw new Error(`${msg("ERRORS.IMAGE_GENERATION_FAILED")}: ${err}`);
  }
  const uris = extractResultUris(endpoint, await res.json());
  if (uris.length === 0) {
    throw new Error(msg("ERRORS.IMAGE_GENERATION_FAILED"));
  }
  return uris;
}

export async function handleImageStream(
  apiKey: string,
  body: MediaStreamBody,
  userId: number,
) {
  const prompt = await moderatedPrompt(body, userId, "image");
  const model = (await getPricingSummary()).byName.get(body.model);
  const endpoint = chooseEndpoint(model?.endpointTypes ?? []);
  if (!endpoint) throw new Error(msg("ERRORS.IMAGE_GENERATION_FAILED"));
  return streamResponse(async (writer) => {
    const images = await generateImage(
      apiKey,
      body.model,
      prompt,
      endpoint,
      body.group,
    );

    // Stream inline data URLs; client persists base64. Guests never touch Turso/R2: no FK violation, no blocked embeds.
    const dataUrls = await Promise.all(
      images.map(async (img: string) => {
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

    writeBufferedMessage(writer, markdown);
  });
}

export async function handleVideoTaskStream(
  apiKey: string,
  body: MediaStreamBody,
  userId: number,
) {
  const prompt = await moderatedPrompt(body, userId, "video");
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
): Promise<{ dataUri: string }> {
  const res = await upstreamPost(
    apiKey,
    "/v1/audio/speech",
    { model, input, voice: "alloy" },
    "ERRORS.AUDIO_GENERATION_FAILED",
    "stream.audio",
    group,
  );
  const mime = res.headers.get("content-type") ?? "audio/mpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { dataUri: base64ToDataUri(buf.toString("base64"), mime) };
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

  return streamResponse(async (writer) => {
    const { dataUri } = await generateSpeech(
      apiKey,
      body.model,
      input,
      body.group,
    );
    // data:audio/ markdown renders as <audio>; client persists the base64 into local media like generated images.
    writeBufferedMessage(writer, `![audio](${dataUri})`);
  });
}

export async function generateEmbedding(
  apiKey: string,
  model: string,
  input: string,
  group?: string | null,
): Promise<{ dims: number; vector: number[] }> {
  const res = await upstreamPost(
    apiKey,
    "/v1/embeddings",
    { model, input },
    "ERRORS.EMBEDDING_FAILED",
    "stream.embedding",
    group,
  );
  const json = (await res.json()) as {
    data?: { embedding?: number[] }[];
  };
  const vector = json.data?.[0]?.embedding ?? [];
  return { dims: vector.length, vector };
}

export async function handleEmbeddingStream(
  apiKey: string,
  body: MediaStreamBody,
) {
  const input = extractLastUserText(body.messages);
  if (!input) throw new Error(msg("ERRORS.NO_EMBEDDING_INPUT"));

  return streamResponse(async (writer) => {
    const { dims, vector } = await generateEmbedding(
      apiKey,
      body.model,
      input,
      body.group,
    );
    const preview = vector.slice(0, 8).map((n) => n.toFixed(6));
    const tail = vector.length > 8 ? ", ..." : "";
    // Plain text (not a t() key): persisted message content, not re-translated.
    const text = [
      `Embedding vector (${dims} dimensions):`,
      "",
      "```json",
      `[${preview.join(", ")}${tail}]`,
      "```",
    ].join("\n");
    writeBufferedMessage(writer, text);
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
