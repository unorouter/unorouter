"use client";

import type { ProcessedModel } from "@/lib/api/pricing";
import type { AssemblerDeps } from "@/lib/ai/chat/pipeline/deps";
import type { FreeModelGenerate } from "@/lib/ai/chat/free-model-race";
import { env } from "@/lib/config/env";
import { API_ENDPOINTS } from "@/lib/ai/endpoints";
import { inlinePdfText } from "@/lib/ai/chat/pdf-extract";
import { handleElysia } from "@/lib/utils/base";
import { rpc } from "@/lib/rpc";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { makeClientTriggerOps } from "./trigger-ops-client";
import { llmCall } from "./utility-llm";

type PricingData = { models?: ProcessedModel[] };

function modelLookup(): (model: string) => ProcessedModel | undefined {
  const data = getQueryClient().getQueryData(queryKeys.pricing()) as
    PricingData | undefined;
  const byName = new Map((data?.models ?? []).map((m) => [m.name, m]));
  return (model) => byName.get(model);
}

const generate: FreeModelGenerate = llmCall("");

const runUtilityLLM: FreeModelGenerate = (modelName, opts) =>
  llmCall(modelName)("", opts);

export function buildDefaultClientDeps(userId: number): AssemblerDeps {
  const getModelInfo = modelLookup();
  return {
    getModelInfo,
    upstreamTarget: {
      endpoint: API_ENDPOINTS.chatCompletions,
      url: `${env.apiUrl}${API_ENDPOINTS.chatCompletions}`,
    },
    inlinePdfText,
    webSearch: async (args) => {
      if (!args.lastUserText) return undefined;
      const data = handleElysia(
        await rpc.api.ai.chat["web-search"].post({ text: args.lastUserText }),
      );
      return data.block ?? undefined;
    },
    runFreeModelRace: {
      listFreeModels: async () => ["free"],
      generate,
    },
    runUtilityLLM,
    retrieveSemantic: async (_apiKey, query, candidates, opts) => {
      if (candidates.length === 0) return [];
      try {
        const ranked = handleElysia(
          await rpc.api.ai.chat["trigger-op"].similarity.post({
            source: query,
            values: candidates.map((c) => c.text),
          }),
        );
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
