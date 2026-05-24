import type { ModelType } from "@/lib/api/pricing";
import { isMediaModel } from "@/lib/api/pricing-cache";
import { msg } from "@/lib/config/constants";
import { fetchCheckUpload, uploadBase64ToR2 } from "@/lib/config/r2";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { imageGenResponseChecker } from "@/lib/validation/media";
import { upstreamApiUrl } from "@/server/constants";
import { serverEnv } from "@/server/env";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessageStreamWriter,
} from "ai";
import { assertPromptAllowed } from "../augmentation/moderation.service";
import { submitVideoTask } from "../augmentation/task.service";
import { extractLastUserText, type StreamMessages } from "./transforms";

export type MediaStreamBody = {
  model: string;
  messages: StreamMessages;
  convId?: string | null;
};

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

export async function handleImageStream(
  apiKey: string,
  body: MediaStreamBody,
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
      const { images, isBase64 } = await generateImage(
        apiKey,
        body.model,
        prompt,
        endpointPath!,
      );

      // Unique scope when no convId (guest tmp/ collision).
      const convId = body.convId ?? `tmp-${uid(8)}`;
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

      writeBufferedMessage(writer, markdown);
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export async function handleVideoTaskStream(
  apiKey: string,
  body: MediaStreamBody,
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

export function handleBufferedStream(
  result: ReturnType<typeof streamText>,
  body: MediaStreamBody,
  mediaType: ModelType,
) {
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const fullText = await result.text;
      const convId = body.convId ?? `tmp-${uid(8)}`;

      const cleanText = await processUrls(fullText, convId, mediaType);
      writeBufferedMessage(writer, cleanText);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
