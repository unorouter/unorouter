"use client";

// Dry-run: assemble the full prompt the engine WOULD send, WITHOUT calling the LLM (no tokens burned).
// Reuses the exact client assembly (prepareChatRequest + the same deps/body the live transport builds), so
// what dry-run shows is byte-for-byte what a real send assembles. Powers a prompt-inspection drawer + makes
// the agent-migration verifiable (diff the assembled prompt before/after wiring an agent in).

import {
  prepareChatRequest,
  type PreparedChatRequest,
} from "@/lib/ai/chat/pipeline/prepare.service";
import type { StreamMessages } from "@/lib/ai/chat/pipeline/transforms";
import type { ChatUIMessage } from "@/lib/types";
import { chatModelAtom, chatStore, localUserIdAtom } from "@/store/chat-store";
import { buildChatRequestBody } from "./chat-transport";
import { resolveModelTargetFromStore } from "./resolve-model-target";

export type DryRunResult = {
  model: string;
  // The resolved system param (null for noSystemRole models, where system lives in the messages array).
  system: string | undefined;
  // The exact messages array that would go upstream.
  messages: StreamMessages;
  // The same request-log snapshot the live path persists, for inspection.
  debug: PreparedChatRequest["debugRequestSnapshot"];
  // True when a start trigger requested the prompt not be sent.
  stopRequested: boolean;
};

// Build the same prepared request a real send would, then return the assembled prompt instead of streaming.
export async function dryRunChatRequest(
  messages: ChatUIMessage[],
  getConvId: () => string | null,
): Promise<DryRunResult> {
  const userId = chatStore.get(localUserIdAtom);
  const modelId = chatStore.get(chatModelAtom) ?? "";
  const fields = await buildChatRequestBody(getConvId);
  const target = await resolveModelTargetFromStore(modelId);

  const body = {
    ...fields,
    model: target.model,
    messages: messages as unknown as StreamMessages,
    ...(target.tokenizer ? { tokenizer: target.tokenizer } : {}),
  };
  const prepared = await prepareChatRequest(
    target.apiKey,
    body,
    userId,
    target.deps,
  );

  return {
    model: target.model,
    system: prepared.effectiveSystem,
    messages: prepared.messagesForUpstream,
    debug: prepared.debugRequestSnapshot,
    stopRequested: prepared.stopRequested,
  };
}
