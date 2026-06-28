"use client";

// Shared /trigger-op/llm wrapper. ChatML keeps the system prompt (runTriggerLLM parses <|im_start|> blocks;
// otherwise the whole string is one user turn). `model` selects the upstream model ("" = the free pick).
// Used by the default-path deps (free race + utility) and the illustrator prompt-writer.

import type { FreeModelGenerate } from "@/lib/ai/chat/free-model-race";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";

export function llmCall(model: string): FreeModelGenerate {
  return async (_modelName, opts) => {
    const prompt = opts.systemPrompt
      ? `<|im_start|>system<|im_sep|>${opts.systemPrompt}<|im_end|><|im_start|>user<|im_sep|>${opts.prompt}<|im_end|>`
      : opts.prompt;
    const text = handleElysia(
      await rpc.api.ai.chat["trigger-op"].llm.post({ prompt, model }),
    );
    return { text };
  };
}
