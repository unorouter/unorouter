"use client";

import { useMessagesInfiniteQuery } from "@/hooks/chat-hook";
import type { ApiMessage } from "@/lib/chat/messages";
import { useAuiState } from "@assistant-ui/react";
import { createContext, useContext } from "react";

export type MessageMeta = {
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
          .filter((m): m is ApiMessage & { id: string } => !!m.id)
          .map((m) => [m.id, m] as const),
      ),
    };
    cache.set(pages, entry);
  }
  return entry;
}

/** Provides a conversation ID override for contexts without a thread list (e.g. shared pages). */
export const ConvIdOverrideContext = createContext<string | null>(null);

export function useMessageMeta(messageIndex: number): MessageMeta | null {
  const remoteId = useAuiState((s) => s.threadListItem?.remoteId);
  const messageId = useAuiState((s) => s.message.id);
  const convIdOverride = useContext(ConvIdOverrideContext);
  const effectiveId = remoteId ?? convIdOverride ?? undefined;
  const messagesQuery = useMessagesInfiniteQuery(effectiveId);

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
