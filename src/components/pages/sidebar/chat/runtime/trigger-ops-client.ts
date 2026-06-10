"use client";

// Client-side TriggerOps: runLLM/checkSimilarity/runImgGen go through the BFF
// trigger-op endpoint (key resolution server-side); showAlert uses the
// imperative dialog/toast surface.

import { triggerAlert } from "@/components/ui/trigger-alert";
import type { TriggerOps } from "@/lib/ai/chat/triggers/types";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { chatModelAtom, chatStore } from "@/store/chat-store";

export function makeClientTriggerOps(): TriggerOps {
  return {
    runLLM: async (prompt) =>
      handleElysia(
        await rpc.api.ai.chat["trigger-op"].post({
          op: "llm",
          prompt,
          model: chatStore.get(chatModelAtom) ?? "",
        }),
      ) as string,
    similarity: async (source, values) =>
      handleElysia(
        await rpc.api.ai.chat["trigger-op"].post({
          op: "similarity",
          source,
          values,
        }),
      ) as string[],
    imgGen: async (prompt, negative) =>
      handleElysia(
        await rpc.api.ai.chat["trigger-op"].post({
          op: "imggen",
          prompt,
          negative,
        }),
      ) as string,
    alert: (kind, text, options) => triggerAlert(kind, text, options),
  };
}
