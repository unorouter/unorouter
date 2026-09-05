"use client";

import { generateText, embed, embedMany } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AssemblerDeps } from "@/lib/ai/chat/pipeline/deps";
import type { FreeModelGenerate } from "@/lib/ai/chat/free-model-race";
import { normalizeBaseUrl } from "@/lib/ai/chat/custom-provider-id";
import { inlinePdfText } from "@/lib/ai/chat/pdf-extract";
import { cosineSimilarity } from "@/lib/utils/base";
import {
  makeUpstreamFetch,
  type BodyMutations,
} from "@/lib/ai/chat/provider-mutations";
import { makeClientTriggerOps } from "./trigger-ops-client";
import type { CustomProviderRow } from "@/lib/db/schema/rows";

function makeProvider(provider: CustomProviderRow, mutations?: BodyMutations) {
  return createOpenAICompatible({
    name: "custom",
    baseURL: normalizeBaseUrl(provider.baseUrl),
    apiKey: provider.apiKey,
    fetch: makeUpstreamFetch(mutations),
  });
}

export function buildClientDeps(provider: CustomProviderRow): AssemblerDeps {
  const sdk = makeProvider(provider);
  const firstModel = provider.models[0]?.key;

  const generate: FreeModelGenerate = (modelName, opts) =>
    generateText({
      model: sdk.chatModel(modelName),
      system: opts.systemPrompt,
      prompt: opts.prompt,
      maxOutputTokens: opts.maxOutputTokens,
      maxRetries: 0,
      ...(opts.abortSignal ? { abortSignal: opts.abortSignal } : {}),
    });

  const baseUrl = normalizeBaseUrl(provider.baseUrl);
  return {
    getModelInfo: async () => undefined,
    upstreamTarget: {
      endpoint: "/chat/completions",
      url: `${baseUrl}/chat/completions`,
    },
    inlinePdfText,
    webSearch: async () => undefined,
    runUtilityLLM: generate,
    retrieveSemantic: async (_apiKey, query, candidates, opts) => {
      if (!firstModel || candidates.length === 0) return [];
      try {
        const model = sdk.embeddingModel(firstModel);
        const [{ embedding: q }, { embeddings: cand }] = await Promise.all([
          embed({ model, value: query }),
          embedMany({ model, values: candidates.map((c) => c.text) }),
        ]);
        return candidates
          .map((c, i) => ({
            id: c.id,
            text: c.text,
            score: cosineSimilarity(q, cand[i]),
          }))
          .filter((x) => x.score >= 0.2)
          .sort((a, b) => b.score - a.score)
          .slice(0, opts.topK)
          .map((x) => ({ id: x.id, text: x.text }));
      } catch {
        return [];
      }
    },
    triggerOps: () => makeClientTriggerOps(),
  };
}
