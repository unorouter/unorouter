import type { StreamBody } from "@/lib/ai/chat/pipeline/prepare.service";
import { msg } from "@/lib/config/constants";
import { logger } from "@/lib/utils/logger";
import { getModelByName } from "@/server/models/pricing/pricing.service";
import {
  handleAudioStream,
  handleEmbeddingStream,
  handleImageStream,
  handleVideoTaskStream,
} from "./media-stream";

export async function streamMedia(apiKey: string, body: StreamBody) {
  const mediaType = (await getModelByName(body.model))?.type;

  const settingsGroup = (
    body.chatContext?.settings as { group?: string | null } | undefined
  )?.group;
  body.group = body.group ?? settingsGroup ?? null;

  logger.info("Media stream started", {
    context: "stream.media",
    model: body.model,
    mediaType,
    convId: body.convId,
  });

  switch (mediaType) {
    case "image":
      return handleImageStream(apiKey, body);
    case "video":
      return handleVideoTaskStream(apiKey, body);
    case "audio":
      return handleAudioStream(apiKey, body);
    case "embedding":
      return handleEmbeddingStream(apiKey, body);
    default:
      throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
}
