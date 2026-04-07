"use client";

import { ConvIdOverrideContext } from "@/hooks/ui/use-chat-hook";
import { useLoadedMessages } from "@/hooks/ui/use-loaded-messages";
import { useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";

type SharedChatProviderProps = {
  convId: string;
  children: React.ReactNode;
};

/**
 * Lightweight runtime provider for shared (read-only) conversations.
 * Uses the pre-seeded chatMessages cache via useLoadedMessages,
 * mirroring the regular ChatRuntimeProvider's data flow.
 */
export function SharedChatProvider(props: SharedChatProviderProps) {
  const chat = useChat({ id: props.convId });

  useLoadedMessages(props.convId, props.convId, chat.setMessages);

  const runtime = useAISDKRuntime(chat);

  return (
    <ConvIdOverrideContext value={props.convId}>
      <AssistantRuntimeProvider runtime={runtime}>
        {props.children}
      </AssistantRuntimeProvider>
    </ConvIdOverrideContext>
  );
}
