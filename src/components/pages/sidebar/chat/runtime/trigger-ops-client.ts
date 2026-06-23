"use client";

// Client-side TriggerOps: runLLM/checkSimilarity/runImgGen go through the BFF trigger-op endpoint; showAlert uses the dialog/toast.

import { triggerAlert } from "@/components/ui/trigger-alert";
import type { TriggerOps } from "@/lib/ai/chat/triggers/types";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { upsertLocalMedia } from "@/lib/db/client/data/media";
import { chatModelAtom, chatStore, convIdAtom } from "@/store/chat-store";

export function makeClientTriggerOps(userId: number): TriggerOps {
  return {
    runLLM: async (prompt) =>
      handleElysia(
        await rpc.api.ai.chat["trigger-op"].llm.post({
          prompt,
          model: chatStore.get(chatModelAtom) ?? "",
        }),
      ),
    similarity: async (source, values) =>
      handleElysia(
        await rpc.api.ai.chat["trigger-op"].similarity.post({
          source,
          values,
        }),
      ),
    imgGen: async (prompt, negative) => {
      const img = handleElysia(
        await rpc.api.ai.chat["trigger-op"].imggen.post({
          prompt,
          negative,
        }),
      );
      if (!img) return "Error: Image generation failed";
      await upsertLocalMedia(userId, {
        id: img.id,
        convId: chatStore.get(convIdAtom),
        mimeType: img.mimeType,
        sizeBytes: img.sizeBytes,
        dataBase64: img.dataBase64,
        r2Key: null,
        r2Url: null,
      });
      return `{{inlay::${img.id}}}`;
    },
    alert: (kind, text, options) => triggerAlert(kind, text, options),
  };
}
