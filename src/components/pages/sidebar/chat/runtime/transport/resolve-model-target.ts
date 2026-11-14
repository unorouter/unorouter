"use client";

import {
  isCustomModelId,
  normalizeBaseUrl,
  parseCustomModelId,
} from "@/lib/ai/chat/custom-provider-id";
import type { TokenizerRef } from "@/lib/ai/chat/tokenizer";
import type { AssemblerDeps } from "@/lib/ai/chat/pipeline/deps";
import { readLocalCustomProvider } from "@/lib/db/client/data/rp/custom-providers";
import { buildClientDeps } from "@/components/pages/sidebar/chat/runtime/transport/client-deps";
import { buildDefaultClientDeps } from "@/components/pages/sidebar/chat/runtime/transport/default-deps";

type ModelTarget = {
  isCustom: boolean;
  model: string;
  apiKey: string;
  baseURL: string;
  deps: AssemblerDeps;
  tokenizer?: TokenizerRef;
  // Set when the provider's proxy toggle is on: the request goes to our
  // custom-forward route and this header tells it where to send it.
  extraHeaders?: Record<string, string>;
};

export async function resolveModelTarget(
  modelId: string,
): Promise<ModelTarget> {
  const origin = window.location.origin;
  if (isCustomModelId(modelId)) {
    const parsed = parseCustomModelId(modelId);
    if (!parsed) throw new Error("invalid custom model id");
    const provider = await readLocalCustomProvider(parsed.providerId);
    if (!provider) throw new Error("custom provider not found");
    const modelRow = provider.models.find((m) => m.key === parsed.modelKey);
    const target = normalizeBaseUrl(provider.baseUrl);
    const proxied = provider.proxy === true;
    return {
      isCustom: true,
      model: parsed.modelKey,
      apiKey: provider.apiKey,
      baseURL: proxied ? `${origin}/api/ai/chat/custom-forward` : target,
      deps: buildClientDeps(provider),
      tokenizer: modelRow?.tokenizer ?? undefined,
      ...(proxied ? { extraHeaders: { "x-proxy-target": target } } : {}),
    };
  }
  return {
    isCustom: false,
    model: modelId,
    apiKey: "proxy",
    baseURL: `${origin}/api/ai/chat/forward`,
    deps: buildDefaultClientDeps(),
  };
}
