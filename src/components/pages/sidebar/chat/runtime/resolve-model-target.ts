"use client";

// Single model-id -> request-target resolver. A model id is either a catalog model (-> our /forward proxy,
// token injected server-side) or a custom-provider model (`custom:::<providerId>:::<modelKey>` -> the user's
// own endpoint + key). EVERY caller that needs to reach a model (the live transport, dry-run, the illustrator
// agent, any future agent) resolves through here so custom vs catalog is decided in ONE place. Previously
// this branch was copy-pasted across routing-chat-transport / dry-run / illustrator-run (the illustrator's
// copy was custom-blind and always hit our server).

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
  // True for a custom-provider (BYOK) model; the request goes to the user's endpoint, never our server.
  isCustom: boolean;
  // The real upstream model id ("custom:::a:::gpt-4" -> "gpt-4"; catalog -> the id unchanged).
  model: string;
  // Catalog: "proxy" placeholder (the /forward proxy injects the real token). Custom: the user's key.
  apiKey: string;
  // Catalog: same-origin /forward proxy. Custom: the user's normalized endpoint.
  baseURL: string;
  // The injected deps for assembly (web search, embeddings, utility LLM, model info, ...).
  deps: AssemblerDeps;
  // Per-model tokenizer for budget counting (custom path); catalog infers from the model name.
  tokenizer?: TokenizerRef;
};

// Resolve a model id to its request target. Throws on a malformed/missing custom provider (same as the live
// transport did). `origin` is window.location.origin on the client; passed in so this stays testable.
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
    // The proxy injects the real token from cookies; the SDK only needs a truthy placeholder. ABSOLUTE
    // same-origin URL because the SDK does `new URL(baseURL + path)` (a relative base throws).
    apiKey: "proxy",
    baseURL: `${origin}/api/ai/chat/forward`,
    deps: buildDefaultClientDeps(userId),
  };
}

// Store-backed convenience: reads the user id from the jotai chatStore + the live origin, so callers in the
// browser don't repeat those reads. Use this on the client; use resolveModelTarget directly in tests.
export function resolveModelTargetFromStore(
  modelId: string,
): Promise<ModelTarget> {
  return resolveModelTarget(
    modelId,
    chatStore.get(localUserIdAtom),
    window.location.origin,
  );
}
