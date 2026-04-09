"use client";

import {
  createR2AttachmentAdapter,
  extractParts,
} from "@/components/pages/chat/utils/chat-utils";
import { createThreadListAdapter } from "@/components/pages/chat/utils/thread-list-adapter";
import {
  useConversationQuery,
  usePersistMessagesMutation,
  useUpdateConversationMutation,
} from "@/hooks/chat-hook";
import { useAuthQuery } from "@/hooks/auth-hook";
import { useLoadedMessages } from "@/hooks/ui/use-loaded-messages";
import { queryKeys } from "@/lib/react-query/keys";
import type { MessagePart, PersistMessage } from "@/lib/types/chat";
import { uid } from "@/lib/utils/base";
import {
  chatModelAtom,
  chatStore,
  getChatModel,
  getChatWebSearch,
  getConvId,
  setConvId,
} from "@/store/chat-store";
import { useChat } from "@ai-sdk/react";
import {
  AssistantRuntimeProvider,
  useAuiState,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport } from "ai";
import { useSetAtom } from "jotai";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

function ChatRuntimeHook() {
  const threadId = useAuiState((s) => s.threadListItem.id);
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const setChatModel = useSetAtom(chatModelAtom);
  const queryClient = useQueryClient();

  const persistMutation = usePersistMessagesMutation();

  // Sync remoteId into convId synchronously (transport body reads this immediately)
  const prevRemoteIdRef = useRef<string | null | undefined>(undefined);
  const nextConvId = remoteId ?? null;
  if (prevRemoteIdRef.current !== nextConvId) {
    prevRemoteIdRef.current = nextConvId;
    setConvId(nextConvId);
  }

  // Mutable per-message context for closures that outlive the render
  const ctx = useRef<{
    sendModel: string | null;
    pendingUserMessages: Array<{ parts: MessagePart[] }>;
  }>({
    sendModel: null,
    pendingUserMessages: [],
  });

  // Two-way model sync: server → atom on thread switch, atom → server on user change.
  // Single effect with a jotai subscription replaces two effects + multiple refs.
  const conversationQuery = useConversationQuery(remoteId);
  const updateConversation = useUpdateConversationMutation();
  const modelSyncRef = useRef({
    lastSyncedId: undefined as string | undefined,
    updateConversation,
    queryClient,
    setChatModel,
  });
  modelSyncRef.current.updateConversation = updateConversation;
  modelSyncRef.current.queryClient = queryClient;
  modelSyncRef.current.setChatModel = setChatModel;

  // Server → atom: when conversation data arrives for a new thread, push its model into the selector
  const serverModel = conversationQuery.data?.model;
  useEffect(() => {
    if (!remoteId || !serverModel || remoteId === modelSyncRef.current.lastSyncedId) return;
    modelSyncRef.current.lastSyncedId = remoteId;
    setChatModel(serverModel);
  }, [remoteId, serverModel, setChatModel]);

  // Atom → server: persist user-initiated model changes
  useEffect(() => {
    return chatStore.sub(chatModelAtom, () => {
      const id = getConvId();
      const newModel = getChatModel();
      if (!id || !newModel) return;
      const cached = modelSyncRef.current.queryClient.getQueryData<{
        model?: string;
      }>(queryKeys.chatMeta(id));
      if (cached?.model === newModel) return;
      modelSyncRef.current.updateConversation.mutate({
        id,
        body: { model: newModel },
      });
    });
  }, []);

  const transportRef = useRef(
    new DefaultChatTransport({
      api: "/api/chat/stream",
      body: () => ({
        model: getChatModel(),
        convId: getConvId(),
        webSearch: getChatWebSearch(),
      }),
    }),
  );

  const chat = useChat({
    id: threadId,
    transport: transportRef.current,
    onFinish: ({ message }) => {
      const convId = getConvId();
      if (!convId) return;

      // Drain all pending user messages (from new thread where remoteId wasn't available at send time)
      const pendingMessages = ctx.current.pendingUserMessages;
      const msgs: PersistMessage[] = [];
      const usedModel = ctx.current.sendModel ?? undefined;
      if (pendingMessages.length > 0) {
        for (const pending of pendingMessages) {
          msgs.push({
            role: "user",
            model: usedModel,
            parts: pending.parts,
          });
        }
        ctx.current.pendingUserMessages = [];
      }
      msgs.push({
        role: message.role,
        model: usedModel,
        parts: message.parts,
      });

      persistMutation.mutate({ id: convId, body: { messages: msgs } });
    },
  });

  // Feed loaded messages into useChat (initial load + infinite scroll)
  useLoadedMessages(threadId, remoteId, chat.setMessages);

  const wrappedChat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      ctx.current.sendModel = getChatModel();
      const parts = extractParts(args[0]);
      if (parts.length > 0) {
        // remoteId is the source of truth; getConvId() may be stale if useEffect hasn't synced yet
        const convId = remoteId ?? null;
        if (!convId) {
          // Pre-generate ID so the transport body and adapter.initialize use the same ID
          setConvId(uid());
          // New thread: queue until onFinish (after adapter.initialize sets remoteId)
          ctx.current.pendingUserMessages.push({ parts });
        } else {
          // Existing thread: persist immediately
          persistMutation.mutate({
            id: convId,
            body: {
              messages: [
                { role: "user", model: getChatModel() ?? undefined, parts },
              ],
            },
          });
        }
      }

      return chat.sendMessage(...args);
    },
  };

  return useAISDKRuntime(wrappedChat, {
    adapters: {
      attachments: createR2AttachmentAdapter(() => ({
        convId: getConvId(),
      })),
    },
  });
}

export function ChatRuntimeProvider(props: { children: React.ReactNode }) {
  const params = useParams<{ convId?: string }>();
  const queryClient = useQueryClient();
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;
  const adapterRef = useRef(createThreadListAdapter(queryClient, t, isLoggedIn));

  // Update the adapter's isLoggedIn state when auth changes
  useEffect(() => {
    adapterRef.current = createThreadListAdapter(queryClient, t, isLoggedIn);
  }, [isLoggedIn]);

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: ChatRuntimeHook,
    adapter: adapterRef.current,
    initialThreadId: params.convId,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {props.children}
    </AssistantRuntimeProvider>
  );
}
