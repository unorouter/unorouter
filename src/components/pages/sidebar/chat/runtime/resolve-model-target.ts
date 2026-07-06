"use client";

import {
  isCustomModelId,
  normalizeBaseUrl,
  parseCustomModelId,
} from "@/lib/ai/chat/custom-provider-id";
import type { TokenizerRef } from "@/lib/ai/chat/tokenizer";
import type { AssemblerDeps } from "@/lib/ai/chat/pipeline/deps";
import { readLocalCustomProvider } from "@/lib/db/client/data/rp/custom-providers";
import { chatStore, localUserIdAtom } from "@/store/chat-store";
import { buildClientDeps } from "./client-deps";
import { buildDefaultClientDeps } from "./default-deps";

export type ModelTarget = {
  isCustom: boolean;
  model: string;
  apiKey: string;
  baseURL: string;
  deps: AssemblerDeps;
  tokenizer?: TokenizerRef;
};

export async function resolveModelTarget(
  modelId: string,
  userId: number,
  origin: string,
): Promise<ModelTarget> {
  if (isCustomModelId(modelId)) {
    const parsed = parseCustomModelId(modelId);
    if (!parsed) throw new Error("invalid custom model id");
    const provider = await readLocalCustomProvider(userId, parsed.providerId);
    if (!provider) throw new Error("custom provider not found");
    const modelRow = provider.models.find((m) => m.key === parsed.modelKey);
    return {
      isCustom: true,
      model: parsed.modelKey,
      apiKey: provider.apiKey,
      baseURL: normalizeBaseUrl(provider.baseUrl),
      deps: buildClientDeps(userId, provider),
      tokenizer: (modelRow?.tokenizer as TokenizerRef | undefined) ?? undefined,
    };
  }
  return {
    isCustom: false,
    model: modelId,
    apiKey: "proxy",
    baseURL: `${origin}/api/ai/chat/forward`,
    deps: buildDefaultClientDeps(userId),
  };
}

export function resolveModelTargetFromStore(
  modelId: string,
): Promise<ModelTarget> {
  return resolveModelTarget(
    modelId,
    chatStore.get(localUserIdAtom),
    window.location.origin,
  );
}
