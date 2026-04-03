"use client";

import {
  createR2AttachmentAdapter,
  extractParts,
  mapRawMessages,
} from "@/components/pages/chat/utils/chat-utils";
import { createThreadListAdapter } from "@/components/pages/chat/utils/thread-list-adapter";
import {
  useMessagesInfiniteQuery,
  usePersistMessagesMutation,
} from "@/hooks/chat-hook";
import { uid } from "@/lib/utils/base";
import { newChatModelAtom } from "@/store/client-store";
import { useChat } from "@ai-sdk/react";
import {
  AssistantRuntimeProvider,
  useAuiState,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport } from "ai";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";

function ChatRuntimeHook() {
  const threadId = useAuiState((s) => s.threadListItem.id);
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const model = useAtomValue(newChatModelAtom);

  const persistMutation = usePersistMessagesMutation();

  // Mutable context for closures that outlive the render (onFinish, transport body, attachment adapter)
  const ctx = useRef({ remoteId, model, msgId: "" });
  ctx.current.remoteId = remoteId;
  ctx.current.model = model;

  const transportRef = useRef(
    new DefaultChatTransport({
      api: "/api/chat/stream",
      body: () => ({
        model: ctx.current.model,
        convId: ctx.current.remoteId,
      }),
    }),
  );

  // Load messages for existing conversations
  const messagesQuery = useMessagesInfiniteQuery(remoteId);
  const chat = useChat({
    id: threadId,
    transport: transportRef.current,
    onFinish: ({ message }) => {
      const convId = ctx.current.remoteId;
      if (!convId) return;
      persistMutation.mutate({
        id: convId,
        body: {
          messages: [
            {
              id: message.id,
              role: message.role,
              parts: message.parts,
            },
          ],
        },
      });
    },
  });

  // Feed loaded messages into useChat when switching threads
  const loadedThreadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!messagesQuery.data || loadedThreadRef.current === threadId) return;
    loadedThreadRef.current = threadId;
    const allPages = [...messagesQuery.data.pages].reverse();
    const messages = mapRawMessages(allPages.flatMap((p) => p.messages));
    if (messages.length > 0) chat.setMessages(messages);
  }, [messagesQuery.data, threadId]);

  const wrappedChat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      // Persist user message (adapter.initialize handles conv creation)
      const parts = extractParts(args[0]);
      if (remoteId && parts.length > 0) {
        const msgId = uid();
        ctx.current.msgId = msgId;
        persistMutation.mutate({
          id: remoteId,
          body: { messages: [{ id: msgId, role: "user", parts }] },
        });
      }

      return chat.sendMessage(...args);
    },
  };

  return useAISDKRuntime(wrappedChat, {
    adapters: {
      attachments: createR2AttachmentAdapter(() => ({
        convId: ctx.current.remoteId ?? null,
        msgId: ctx.current.msgId,
      })),
    },
  });
}

const adapter = createThreadListAdapter();

export function ChatRuntimeProvider(props: { children: React.ReactNode }) {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: ChatRuntimeHook,
    adapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {props.children}
    </AssistantRuntimeProvider>
  );
}
