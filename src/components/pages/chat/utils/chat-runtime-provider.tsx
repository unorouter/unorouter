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
import type {
  ChatRuntimeContext,
  LoadedPagesState,
  PersistMessage,
} from "@/lib/types/chat";
import { uid } from "@/lib/utils/base";
import { chatModelAtom } from "@/store/chat-store";
import { useChat } from "@ai-sdk/react";
import {
  AssistantRuntimeProvider,
  useAuiState,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { DefaultChatTransport } from "ai";
import { useAtomValue } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

function ChatRuntimeHook() {
  const threadId = useAuiState((s) => s.threadListItem.id);
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const model = useAtomValue(chatModelAtom);

  const persistMutation = usePersistMessagesMutation();

  // Mutable context for closures that outlive the render (onFinish, transport body, attachment adapter)
  const ctx = useRef<ChatRuntimeContext>({
    remoteId,
    model,
    msgId: "",
    pendingUserMessage: null,
  });
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

      // Persist pending user message (from new thread where remoteId wasn't available at send time)
      const pending = ctx.current.pendingUserMessage;
      const messages: PersistMessage[] = [];
      if (pending) {
        messages.push({ id: pending.id, role: "user", parts: pending.parts });
        ctx.current.pendingUserMessage = null;
      }
      messages.push({
        id: message.id,
        role: message.role,
        parts: message.parts,
      });

      persistMutation.mutate({ id: convId, body: { messages } });
    },
  });

  // Feed loaded messages into useChat (initial load + older pages from infinite scroll)
  const loadedPagesRef = useRef<LoadedPagesState | null>(null);
  useEffect(() => {
    if (!messagesQuery.data) return;
    const pageCount = messagesQuery.data.pages.length;
    const prev = loadedPagesRef.current;
    if (prev && prev.threadId === threadId && prev.count === pageCount) return;
    const isPrepend =
      prev?.threadId === threadId && pageCount > (prev?.count ?? 0);
    loadedPagesRef.current = { threadId, count: pageCount };

    const allPages = [...messagesQuery.data.pages].reverse();
    const messages = mapRawMessages(allPages.flatMap((p) => p.messages));
    if (messages.length === 0) return;

    if (isPrepend) {
      // Preserve scroll position when prepending older messages
      const viewport = document.querySelector(".aui-thread-viewport");
      const prevHeight = viewport?.scrollHeight ?? 0;
      const prevTop = viewport?.scrollTop ?? 0;
      chat.setMessages(messages);
      requestAnimationFrame(() => {
        if (!viewport) return;
        const target = prevTop + (viewport.scrollHeight - prevHeight);
        viewport.scrollTop = target;
        // Override autoScroll for a few frames
        let frames = 0;
        const keep = () => {
          viewport.scrollTop = target;
          if (++frames < 10) requestAnimationFrame(keep);
        };
        requestAnimationFrame(keep);
      });
    } else {
      chat.setMessages(messages);
    }
  }, [messagesQuery.data, threadId]);

  const wrappedChat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      const parts = extractParts(args[0]);
      if (parts.length > 0) {
        const msgId = uid();
        ctx.current.msgId = msgId;
        const convId = ctx.current.remoteId;
        if (convId) {
          // Existing thread: persist immediately
          persistMutation.mutate({
            id: convId,
            body: { messages: [{ id: msgId, role: "user", parts }] },
          });
        } else {
          // New thread: stash until onFinish (after adapter.initialize sets remoteId)
          ctx.current.pendingUserMessage = { id: msgId, parts };
        }
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

export function ChatRuntimeProvider(props: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const adapterRef = useRef(createThreadListAdapter(queryClient));
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: ChatRuntimeHook,
    adapter: adapterRef.current,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {props.children}
    </AssistantRuntimeProvider>
  );
}
