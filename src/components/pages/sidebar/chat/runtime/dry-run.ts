"use client";

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
  system: string | undefined;
  messages: StreamMessages;
  debug: PreparedChatRequest["debugRequestSnapshot"];
  stopRequested: boolean;
};

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
