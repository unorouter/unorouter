"use client";

import { createUIMessageStream, type UIMessageStreamWriter } from "ai";
import { msg } from "@/lib/config/constants";
import type { ChatUIMessage } from "@/lib/types";
import { uid } from "@/lib/utils/base";
import { extractErrorDetail } from "@/lib/utils/client";
import {
  extractLastUserImageRefs,
  extractLastUserText,
} from "@/lib/ai/chat/pipeline/transforms";
import { generateCustomProviderImage } from "@/components/pages/sidebar/chat/illustrator/custom-image-gen";
import { submitCustomVideo } from "@/components/pages/sidebar/chat/runtime/transport/custom-video";
import type { ProviderCtx } from "@/components/pages/sidebar/chat/runtime/transport/provider-fetch";

type Writer = UIMessageStreamWriter<ChatUIMessage>;

function writeMessage(writer: Writer, write: () => void) {
  writer.write({ type: "start" });
  writer.write({ type: "start-step" });
  write();
  writer.write({ type: "finish-step" });
}

// Same chunks the server media path writes, so persistence and the inlay
// renderer treat a custom image or video exactly like a catalog one.
export function customMediaStream(args: {
  ctx: ProviderCtx;
  modelId: string;
  model: string;
  type: "image" | "video";
  messages: ChatUIMessage[];
  abortSignal?: AbortSignal;
}) {
  return createUIMessageStream<ChatUIMessage>({
    execute: async ({ writer }) => {
      try {
        const prompt = extractLastUserText(args.messages) ?? "";
        const refs = extractLastUserImageRefs(args.messages).map((r) => r.url);
        if (!prompt && refs.length === 0)
          throw new Error(msg("ERRORS.NO_IMAGE_PROMPT"));

        if (args.type === "image") {
          const image = await generateCustomProviderImage(
            args.ctx,
            args.model,
            prompt,
            refs,
            args.abortSignal,
          );
          const id = uid(12);
          writeMessage(writer, () => {
            writer.write({ type: "text-start", id });
            writer.write({
              type: "text-delta",
              id,
              delta: `{{inlay::${image.id}}}`,
            });
            writer.write({ type: "text-end", id });
          });
          writer.write({
            type: "message-metadata",
            messageMetadata: { inlayMedia: [image] },
          });
          writer.write({ type: "finish", finishReason: "stop" });
          return;
        }

        const job = await submitCustomVideo(
          args.ctx,
          args.model,
          prompt,
          refs[0],
          args.abortSignal,
        );
        writeMessage(writer, () =>
          writer.write({
            type: "data-task",
            data: {
              taskId: job.taskId,
              status: job.status,
              progress: "",
              model: args.modelId,
              kind: "video",
              api: job.api,
            },
          }),
        );
        writer.write({ type: "finish", finishReason: "stop" });
      } catch (err) {
        if (args.abortSignal?.aborted) throw err;
        const detail = extractErrorDetail(err);
        writeMessage(writer, () =>
          writer.write({
            type: "data-error",
            data: { message: detail.message, model: args.modelId },
          }),
        );
        writer.write({ type: "finish", finishReason: "error" });
      }
    },
  });
}
