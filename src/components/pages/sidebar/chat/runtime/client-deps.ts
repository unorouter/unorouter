"use client";

// Builds the AssemblerDeps for the browser custom-provider path. Everything the server resolved from
// secrets/Turso/R2/Tavily is replaced with the same isomorphic helper, the user's own endpoint, or a no-op:
//   - inlinePdfText: shared isomorphic extractor (unpdf over the inline data-URL bytes) - same as the server
//   - webSearch: disabled (Tavily is a server secret; custom requests never touch the server)
//   - free-model race / embeddings: the custom provider's own configured models
//   - getModelInfo: undefined (custom models aren't in the catalog -> unknown caps + zero cost, by design)
//   - triggerOps: the existing client bridge (POSTs to the BFF trigger-op endpoints)

import { generateText, embed, embedMany } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AssemblerDeps } from "@/lib/ai/chat/pipeline/deps";
import type { FreeModelGenerate } from "@/lib/ai/chat/free-model-race";
import { normalizeBaseUrl } from "@/lib/ai/chat/custom-provider-id";
import { inlinePdfText } from "@/lib/ai/chat/pdf-extract";
import { cosineSimilarity } from "@/lib/utils/base";
import {
  makeBodyMutationFetch,
  type BodyMutations,
} from "@/lib/ai/chat/provider-mutations";
import { makeClientTriggerOps } from "./trigger-ops-client";
import type { CustomProviderRow } from "@/lib/db/schema/rows";

// One openai-compatible provider against the user's endpoint, reused for the race + embeddings.
function makeProvider(provider: CustomProviderRow, mutations?: BodyMutations) {
  const hasMutation = !!mutations;
  return createOpenAICompatible({
    name: "custom",
    baseURL: normalizeBaseUrl(provider.baseUrl),
    apiKey: provider.apiKey,
    ...(hasMutation ? { fetch: makeBodyMutationFetch(mutations) } : {}),
  });
}

export function buildClientDeps(
  userId: number,
  provider: CustomProviderRow,
): AssemblerDeps {
  const sdk = makeProvider(provider);
  // Auxiliary rolling-summary runs on the custom provider's own models (opt-in memory, the user's endpoint).
  // Title gen is separate: it always uses OUR free models server-side via POST /chat/title.
  const raceModels = provider.models.map((m) => m.key);
  const firstModel = raceModels[0];

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
    getModelInfo: () => undefined,
    upstreamTarget: {
      endpoint: "/chat/completions",
      url: `${baseUrl}/chat/completions`,
    },
    inlinePdfText,
    // No Turso fallback: the client always supplies context.
    webSearch: async () => undefined,
    runFreeModelRace: {
      listFreeModels: async () => raceModels,
      generate,
    },
    // Custom path: `generate` already targets the named model on the user's endpoint (full context), so the
    // utility LLM is the same call - the agent passes the resolved utility/chat model name.
    runUtilityLLM: generate,
    retrieveSemantic: async (_apiKey, query, candidates, opts) => {
      if (!firstModel || candidates.length === 0) return [];
      try {
        const model = sdk.textEmbeddingModel(firstModel);
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
        // Embeddings optional: a provider without an embedding endpoint just skips retrieval.
        return [];
      }
    },
    triggerOps: () => makeClientTriggerOps(userId),
  };
}
