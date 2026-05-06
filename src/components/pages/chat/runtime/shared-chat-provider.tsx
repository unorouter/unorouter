"use client";
/* eslint-disable react-hooks/refs -- history adapter ref is a stable handle, not reactive state */

import { createChatHistoryAdapter } from "@/components/pages/chat/runtime/chat-history-adapter";
import { ConvIdOverrideContext } from "@/hooks/ui/use-chat-hook";
import { useLoadedMessages } from "@/hooks/ui/use-loaded-messages";
import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

type SharedChatProviderProps = {
  convId: string;
  children: React.ReactNode;
};

/**
 * Lightweight runtime provider for shared (read-only) conversations.
 * Reuses the chat history adapter for branch-aware loading.
 */
export function SharedChatProvider(props: SharedChatProviderProps) {
  const chat = useChat({ id: props.convId });
  const queryClient = useQueryClient();

  const historyAdapterRef = useRef(
    createChatHistoryAdapter(queryClient, () => props.convId),
  );

  useLoadedMessages(props.convId, props.convId);

  const runtime = useAISDKRuntime(chat, {
    adapters: { history: historyAdapterRef.current },
  });

  return (
    <ConvIdOverrideContext value={props.convId}>
      <AssistantRuntimeProvider runtime={runtime}>
        {props.children}
      </AssistantRuntimeProvider>
    </ConvIdOverrideContext>
  );
}
