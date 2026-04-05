"use client";

import { useMessagesInfiniteQuery } from "@/hooks/chat-hook";
import { useAuiState } from "@assistant-ui/react";

export type MessageMeta = {
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number | null;
};

type RawMessage = Record<string, unknown>;
type MessageCache = {
  flat: RawMessage[];
  byId: Map<string, RawMessage>;
};

const cache = new WeakMap<object, MessageCache>();

function getMessageCache(pages: object[]): MessageCache {
  let entry = cache.get(pages);
  if (!entry) {
    const flat = [...pages]
      .reverse()
      .flatMap((p) => (p as { messages: RawMessage[] }).messages);
    entry = {
      flat,
      byId: new Map(
        flat
          .filter((m) => m.id)
          .map((m) => [m.id as string, m] as const),
      ),
    };
    cache.set(pages, entry);
  }
  return entry;
}

export function useMessageMeta(messageIndex: number): MessageMeta | null {
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const messageId = useAuiState((s) => s.message.id);
  const messagesQuery = useMessagesInfiniteQuery(remoteId);

  if (!messagesQuery.data) return null;

  const { flat, byId } = getMessageCache(messagesQuery.data.pages);
  const msg = byId.get(messageId) ?? flat[messageIndex];
  if (!msg) return null;

  return {
    model: (msg.model as string) ?? null,
    inputTokens: (msg.inputTokens as number) ?? null,
    outputTokens: (msg.outputTokens as number) ?? null,
    cost: (msg.cost as number) ?? null,
  };
}
