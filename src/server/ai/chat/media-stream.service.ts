import { isMediaModel } from "@/server/models/pricing/pricing-snapshot";
import { GUEST_USER_ID, msg } from "@/lib/config/constants";
import { captureServerEvent } from "@/lib/posthog-server";
import { logger } from "@/lib/utils/logger";
import type { StreamBody } from "@/lib/ai/chat/pipeline/prepare.service";

import {
  handleAudioStream,
  handleEmbeddingStream,
  handleImageStream,
  handleVideoTaskStream,
} from "./media/media-stream";

export async function streamMedia(
  apiKey: string,
  body: StreamBody,
  request: Request,
  userId: number,
) {
  const { mediaType } = await isMediaModel(body.model);

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

  captureServerEvent({
    event: "chat_stream_started",
    request,
    userId,
    properties: {
      model: body.model,
      media_type: mediaType,
      conv_id: body.convId,
      is_guest: userId === GUEST_USER_ID,
    },
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
