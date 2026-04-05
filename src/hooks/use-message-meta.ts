"use client";

import { useMessagesInfiniteQuery } from "@/hooks/chat-hook";
import { useAuiState } from "@assistant-ui/react";

export type MessageMeta = {
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number | null;
};

export function useMessageMeta(messageIndex: number): MessageMeta | null {
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const messagesQuery = useMessagesInfiniteQuery(remoteId);

  if (!messagesQuery.data) return null;

  const allMessages = [...messagesQuery.data.pages]
    .reverse()
    .flatMap((p) => p.messages);
  const msg = allMessages[messageIndex];
  if (!msg) return null;

  return {
    model: msg.model ?? null,
    inputTokens: msg.inputTokens ?? null,
    outputTokens: msg.outputTokens ?? null,
    cost: msg.cost ?? null,
  };
}
