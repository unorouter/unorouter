"use client";

import { useMessagesInfiniteQuery } from "@/hooks/ai/chat-hook";
import type { ApiMessage } from "@/lib/ai/chat/messages";
import { useAuiState } from "@assistant-ui/react";

type MessageMeta = {
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number | null;
};

type MessageCache = {
  flat: ApiMessage[];
  byId: Map<string, ApiMessage>;
};

const cache = new WeakMap<object, MessageCache>();

function getMessageCache(pages: object[]): MessageCache {
  let entry = cache.get(pages);
  if (!entry) {
    const flat = [...pages]
      .reverse()
      .flatMap((p) => (p as { messages: ApiMessage[] }).messages);
    entry = {
      flat,
      byId: new Map(
        flat
          .filter((m): m is ApiMessage => !!m.id)
          .map((m) => [m.id, m] as const),
      ),
    };
    cache.set(pages, entry);
  }
  return entry;
}

export function useMessageMeta(messageIndex: number): MessageMeta | null {
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);
  const messageId = useAuiState((s) => s.message.id);
  const messagesQuery = useMessagesInfiniteQuery(remoteId ?? undefined);

  if (!messagesQuery.data) return null;

  const { flat, byId } = getMessageCache(messagesQuery.data.pages);
  const msg = byId.get(messageId) ?? flat[messageIndex];
  if (!msg) return null;

  return {
    model: msg.model ?? null,
    inputTokens: msg.inputTokens ?? null,
    outputTokens: msg.outputTokens ?? null,
    cost: msg.cost ?? null,
  };
}
