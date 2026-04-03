"use client";

import {
    createR2AttachmentAdapter,
    extractParts,
    mapRawMessages,
} from "@/components/pages/chat/utils/chat-utils";
import { createThreadListAdapter } from "@/components/pages/chat/utils/thread-list-adapter";
import {
    useCreateConversationMutation,
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
import { useEffect, useMemo, useRef } from "react";

const adapter = createThreadListAdapter();

function ChatRuntimeHook() {
  const threadId = useAuiState((s) => s.threadListItem.id);
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const newChatModel = useAtomValue(newChatModelAtom);
  const model = newChatModel;

  const persistMutation = usePersistMessagesMutation();
  const createMutation = useCreateConversationMutation();

  // Mutable context for closures (transport body, onFinish, sendMessage)
  const ctx = useRef({ convId: threadId, msgId: "", model });
  ctx.current.convId = threadId;
  ctx.current.model = model;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat/stream",
        body: () => ({
          model: ctx.current.model,
          convId: ctx.current.convId,
        }),
      }),
    [],
  );

  // Load messages for existing conversations
  const messagesQuery = useMessagesInfiniteQuery(remoteId);
  const pendingCreateRef = useRef(false);

  const chat = useChat({
    id: threadId,
    transport,
    onFinish: ({ message }) => {
      const convId = ctx.current.convId;
      if (!convId) return;
      persistMutation.mutate({
        id: convId,
        body: {
          messages: [
            {
              id: message.id,
              role: message.role,
              parts: message.parts as { type: string; text?: string }[],
            },
          ],
        },
      });
    },
  });

  // Feed loaded messages into useChat when data arrives
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!messagesQuery.data || loadedRef.current) return;
    loadedRef.current = true;
    const allPages = [...messagesQuery.data.pages].reverse();
    const messages = mapRawMessages(
      allPages.flatMap(
        (p) => p.messages as { id: string; role: string; parts: unknown }[],
      ),
    );
    if (messages.length > 0) chat.setMessages(messages);
  }, [messagesQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset loaded flag when switching threads
  useEffect(() => {
    loadedRef.current = false;
  }, [threadId]);

  const sendRef = useRef(chat.sendMessage);
  sendRef.current = chat.sendMessage;

  const wrappedChat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      // Lazily create the conversation on first message
      if (!ctx.current.convId && !pendingCreateRef.current) {
        pendingCreateRef.current = true;
        try {
          const data = await createMutation.mutateAsync({
            body: { model: ctx.current.model! },
          });
          ctx.current.convId = data.id;
        } catch {
          pendingCreateRef.current = false;
          return;
        }
      }

      // Persist user message
      const parts = extractParts(args[0]);
      const convId = ctx.current.convId;
      if (convId && parts.length > 0) {
        const msgId = uid();
        ctx.current.msgId = msgId;
        persistMutation.mutate({
          id: convId,
          body: { messages: [{ id: msgId, role: "user", parts }] },
        });
      }

      return sendRef.current(...args);
    },
  };

  return useAISDKRuntime(wrappedChat, {
    adapters: {
      attachments: createR2AttachmentAdapter(() => ({
        convId: ctx.current.convId,
        msgId: ctx.current.msgId,
      })),
    },
  });
}

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
