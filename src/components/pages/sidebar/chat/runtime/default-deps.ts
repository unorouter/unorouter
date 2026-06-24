"use client";

// AssemblerDeps for the DEFAULT (new-api) path running the engine in the browser. Unlike the custom-provider
// deps, the default path may use OUR services through thin BFF endpoints (the token stays server-side):
//   - getModelInfo: the real catalog ProcessedModel from the pricing query cache (correct output caps + cost)
//   - inlinePdfText: shared isomorphic unpdf extractor
//   - webSearch: POST /chat/web-search (Tavily server-side; guests get null)
//   - runFreeModelRace (rolling summary / classification): POST /chat/trigger-op/llm (our free models)
//   - retrieveSemantic (lore retrieval): POST /chat/trigger-op/similarity (server embeddings)
//   - triggerOps: the existing client bridge

import type { ProcessedModel } from "@/lib/api/pricing";
import type { AssemblerDeps } from "@/lib/ai/chat/pipeline/deps";
import type { FreeModelGenerate } from "@/lib/ai/chat/free-model-race";
import { inlinePdfText } from "@/lib/ai/chat/pdf-extract";
import { handleElysia } from "@/lib/utils/base";
import { rpc } from "@/lib/rpc";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { makeClientTriggerOps } from "./trigger-ops-client";

type PricingData = { models?: ProcessedModel[] };

// Read the catalog from the pricing query cache (populated by usePricingQuery). Built once per send.
function modelLookup(): (model: string) => ProcessedModel | undefined {
  const data = getQueryClient().getQueryData(
    queryKeys.pricing(),
  ) as PricingData | undefined;
  const byName = new Map(
    (data?.models ?? []).map((m) => [m.name, m]),
  );
  return (model) => byName.get(model);
}

// Summary/classification race -> our free models via the BFF llm op. ChatML keeps the system prompt
// (runTriggerLLM parses <|im_start|> blocks; otherwise treats the whole string as one user turn).
const generate: FreeModelGenerate = async (_modelName, opts) => {
  const prompt = opts.systemPrompt
    ? `<|im_start|>system<|im_sep|>${opts.systemPrompt}<|im_end|><|im_start|>user<|im_sep|>${opts.prompt}<|im_end|>`
    : opts.prompt;
  const text = handleElysia(
    await rpc.api.ai.chat["trigger-op"].llm.post({ prompt, model: "" }),
  );
  return { text };
};

export function buildDefaultClientDeps(userId: number): AssemblerDeps {
  const getModelInfo = modelLookup();
  return {
    getModelInfo,
    inlinePdfText,
    webSearch: async (args) => {
      if (!args.lastUserText) return undefined;
      const data = handleElysia(
        await rpc.api.ai.chat["web-search"].post({ text: args.lastUserText }),
      );
      return data.block ?? undefined;
    },
    runFreeModelRace: {
      // The BFF llm op already races our free models server-side; one sentinel triggers a single call.
      listFreeModels: async () => ["free"],
      generate,
    },
    retrieveSemantic: async (_apiKey, query, candidates, opts) => {
      if (candidates.length === 0) return [];
      try {
        // similarity returns the candidate texts ranked best-first; map each back to an id.
        const ranked = handleElysia(
          await rpc.api.ai.chat["trigger-op"].similarity.post({
            source: query,
            values: candidates.map((c) => c.text),
          }),
        );
        // Group ids by text so duplicate-text candidates don't collapse: each ranked occurrence pops the next id.
        const idsByText = new Map<string, string[]>();
        for (const c of candidates) {
          const list = idsByText.get(c.text);
          if (list) list.push(c.id);
          else idsByText.set(c.text, [c.id]);
        }
        return ranked.slice(0, opts.topK).map((text) => ({
          id: idsByText.get(text)?.shift() ?? text,
          text,
        }));
      } catch {
        return [];
      }
    },
    triggerOps: () => makeClientTriggerOps(userId),
  };
}
