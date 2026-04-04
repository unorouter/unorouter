"use client";

import { useMessagesInfiniteQuery } from "@/hooks/chat-hook";
import { useAuiState } from "@assistant-ui/react";
import { createContext, useContext, useMemo, type ReactNode } from "react";

export type MessageMeta = {
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number | null;
};

const MessageMetaContext = createContext<Map<string, MessageMeta>>(new Map());

export function useMessageMeta(msgId: string): MessageMeta | undefined {
  return useContext(MessageMetaContext).get(msgId);
}

export function MessageMetaProvider(props: { children: ReactNode }) {
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const messagesQuery = useMessagesInfiniteQuery(remoteId);

  const metaMap = useMemo(() => {
    const map = new Map<string, MessageMeta>();
    if (!messagesQuery.data) return map;
    for (const page of messagesQuery.data.pages) {
      for (const msg of page.messages) {
        map.set(msg.id, {
          model: msg.model ?? null,
          inputTokens: msg.inputTokens ?? null,
          outputTokens: msg.outputTokens ?? null,
          cost: msg.cost ?? null,
        });
      }
    }
    return map;
  }, [messagesQuery.data]);

  return (
    <MessageMetaContext value={metaMap}>
      {props.children}
    </MessageMetaContext>
  );
}
