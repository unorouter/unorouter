"use client";

import {
  createR2AttachmentAdapter,
  extractParts,
  mapRawMessages,
} from "@/components/pages/chat/utils/chat-utils";
import { createThreadListAdapter } from "@/components/pages/chat/utils/thread-list-adapter";
import {
  useConversationQuery,
  useMessagesInfiniteQuery,
  usePersistMessagesMutation,
  useUpdateConversationMutation,
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
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";

function ChatRuntimeHook() {
  const threadId = useAuiState((s) => s.threadListItem.id);
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const [model, setChatModel] = useAtom(chatModelAtom);

  const persistMutation = usePersistMessagesMutation();

  // Mutable context for closures that outlive the render (onFinish, transport body, attachment adapter)
  const ctx = useRef<ChatRuntimeContext>({
    remoteId,
    model,
    sendModel: null,
    msgId: "",
    pendingUserMessage: null,
  });
  ctx.current.remoteId = remoteId;
  ctx.current.model = model;

  // Sync conversation model to the selector when switching to an existing thread
  const conversationQuery = useConversationQuery(remoteId);
  useEffect(() => {
    if (conversationQuery.data?.model)
      setChatModel(conversationQuery.data.model);
  }, [conversationQuery.data?.model]);

  // Persist model change to server when user switches model on an active conversation
  const updateConversation = useUpdateConversationMutation();
  useEffect(() => {
    if (!remoteId || !model) return;
    if (conversationQuery.data?.model === model) return;
    updateConversation.mutate({ id: remoteId, body: { model } });
  }, [model]);

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
      const usedModel = ctx.current.sendModel ?? undefined;
      if (pending) {
        messages.push({
          id: pending.id,
          role: "user",
          model: usedModel,
          parts: pending.parts,
        });
        ctx.current.pendingUserMessage = null;
      }
      messages.push({
        id: message.id,
        role: message.role,
        model: usedModel,
        parts: message.parts,
      });

      persistMutation.mutate({ id: convId, body: { messages } });
    },
  });

  // Feed loaded messages into useChat (initial load + older pages from infinite scroll)
  const loadedPagesRef = useRef<LoadedPagesState | null>(null);

  useEffect(() => {
    if (!remoteId || !messagesQuery.data) return;
    const pageCount = messagesQuery.data.pages.length;
    const prev = loadedPagesRef.current;
    if (prev && prev.threadId === threadId && prev.count === pageCount) return;
    const isPrepend =
      prev?.threadId === threadId && pageCount > (prev?.count ?? 0);
    loadedPagesRef.current = { threadId, count: pageCount };

    const allPages = [...messagesQuery.data.pages].reverse();
    const seen = new Set<string>();
    const messages = mapRawMessages(allPages.flatMap((p) => p.messages)).filter(
      (m) => (seen.has(m.id) ? false : (seen.add(m.id), true)),
    );
    if (messages.length === 0) return;

    const vp = isPrepend
      ? document.querySelector(".aui-thread-viewport")
      : null;

    if (!isPrepend || !vp) {
      chat.setMessages(messages);
      return;
    }

    // Capture anchor before React replaces DOM nodes
    const anchor = vp.querySelector("[data-message-id]") as HTMLElement | null;
    const aid = anchor?.getAttribute("data-message-id");
    const offset = anchor ? anchor.offsetTop - vp.scrollTop : null;
    const msgCount = vp.querySelectorAll("[data-message-id]").length;

    vp.classList.remove("scroll-smooth");
    chat.setMessages(messages);

    // Idempotent: sets scrollTop so anchor stays at its previous visual offset
    const restore = () => {
      const el = aid
        ? (vp.querySelector(`[data-message-id="${aid}"]`) as HTMLElement)
        : null;
      if (el && offset !== null) vp.scrollTop = el.offsetTop - offset;
    };

    // Poll until React renders new messages, then anchor + watch for reflows
    let n = 0;
    const poll = () => {
      if (vp.querySelectorAll("[data-message-id]").length <= msgCount) {
        if (++n < 30) requestAnimationFrame(poll);
        else vp.classList.add("scroll-smooth");
        return;
      }
      restore();
      let h = vp.scrollHeight;
      const obs = new MutationObserver(() => {
        if (vp.scrollHeight !== h) {
          h = vp.scrollHeight;
          restore();
        }
      });
      obs.observe(vp, { childList: true, subtree: true, attributes: true });
      setTimeout(() => {
        obs.disconnect();
        vp.classList.add("scroll-smooth");
      }, 1000);
    };
    requestAnimationFrame(poll);
  }, [messagesQuery.data, threadId]);

  const wrappedChat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      ctx.current.sendModel = ctx.current.model;
      const parts = extractParts(args[0]);
      if (parts.length > 0) {
        const msgId = uid();
        ctx.current.msgId = msgId;
        const convId = ctx.current.remoteId;
        if (convId) {
          // Existing thread: persist immediately
          persistMutation.mutate({
            id: convId,
            body: {
              messages: [
                { id: msgId, role: "user", model: ctx.current.model ?? undefined, parts },
              ],
            },
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
