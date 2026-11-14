"use client";

import type { PricingCatalogDetail } from "@/openapi";
import type { AssemblerDeps } from "@/lib/ai/chat/pipeline/deps";
import type { FreeModelGenerate } from "@/lib/ai/chat/free-model-race";
import { env } from "@/lib/config/env";
import { API_ENDPOINTS } from "@/lib/ai/endpoints";
import { inlinePdfText } from "@/lib/ai/chat/pipeline/pdf-extract";
import { handleElysia } from "@/lib/utils/base";
import { rpc } from "@/lib/rpc";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { makeClientTriggerOps } from "@/components/pages/sidebar/chat/runtime/transport/trigger-ops-client";

async function fetchModelInfo(
  model: string,
): Promise<PricingCatalogDetail | undefined> {
  if (!model) return undefined;
  try {
    // Unwrapped like useModelDetailQuery, which shares this key.
    const detail = await getQueryClient().query({
      queryKey: queryKeys.pricingModel(model),
      queryFn: async () =>
        handleElysia(
          await rpc.api.models.pricing.detail.get({ query: { model } }),
        ),
      staleTime: 5 * 60 * 1000,
    });
    return detail ?? undefined;
  } catch {
    return undefined;
  }
}

const runUtilityLLM: FreeModelGenerate = async (model, opts) => {
  const prompt = opts.systemPrompt
    ? `<|im_start|>system<|im_sep|>${opts.systemPrompt}<|im_end|><|im_start|>user<|im_sep|>${opts.prompt}<|im_end|>`
    : opts.prompt;
  const text = handleElysia(
    await rpc.api.ai.chat["trigger-op"].llm.post({
      prompt,
      model,
      ...(opts.group ? { group: opts.group } : {}),
    }),
  );
  return { text };
};

export function buildDefaultClientDeps(): AssemblerDeps {
  return {
    getModelInfo: fetchModelInfo,
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
    triggerOps: () => makeClientTriggerOps(),
  };
}
