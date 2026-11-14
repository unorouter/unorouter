import type { Static } from "elysia";
import type { streamBody } from "@/lib/validation/chat";
import { msg } from "@/lib/config/constants";
import { logger } from "@/lib/utils/logger";
import { getModelByName } from "@/server/models/pricing/pricing.service";
import {
  handleAudioStream,
  handleEmbeddingStream,
  handleImageStream,
  handleVideoTaskStream,
} from "./media-stream";

export async function streamMedia(
  apiKey: string,
  body: Static<typeof streamBody>,
) {
  const model = (await getModelByName(body.model)) ?? undefined;
  const mediaType = model?.type;

  logger.info("Media stream started", {
    context: "stream.media",
    model: body.model,
    mediaType,
    convId: body.convId,
  });

  switch (mediaType) {
    case "image":
      return handleImageStream(apiKey, body, model);
    case "video":
      return handleVideoTaskStream(apiKey, body);
    case "audio":
      return handleAudioStream(apiKey, body, model);
    case "embedding":
      return handleEmbeddingStream(apiKey, body, model);
    default:
      throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
}
