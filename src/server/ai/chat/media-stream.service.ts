// Media generation dispatch (image/video/audio/embedding). The TEXT path moved fully client-side (the browser
// assembles + streams via the /forward token-injecting proxy), so this server route now ONLY handles media
// models, which are not OpenAI chat-completions and need server-side endpoints + Creem moderation.

import { isMediaModel } from "@/lib/api/pricing-cache";
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

  // group rides X-Group upstream; the media handlers read body.group. Resolve from toolbar or conv settings.
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
      return handleImageStream(apiKey, body, userId);
    case "video":
      return handleVideoTaskStream(apiKey, body, userId);
    case "audio":
      return handleAudioStream(apiKey, body);
    case "embedding":
      return handleEmbeddingStream(apiKey, body);
    default:
      // Text models no longer hit this route (the client streams them via /forward).
      throw new Error(msg("ERRORS.UNAUTHORIZED"));
  }
}
