"use client";
/* eslint-disable react-hooks/refs -- refs accessed during render for sync transport/adapter state */

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
import type { PersistMessage } from "@/lib/types/chat";
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
    persistedIds: Set<string>;
  }>({
    sendModel: null,
    persistedIds: new Set(),
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
    if (
      !remoteId ||
      !serverModel ||
      remoteId === modelSyncRef.current.lastSyncedId
    )
      return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once on mount, refs hold latest values
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
    onFinish: ({ message, messages }) => {
      const convId = getConvId();
      if (!convId) return;

      const usedModel = ctx.current.sendModel ?? undefined;
      const persisted = ctx.current.persistedIds;

      // Persist every message that hasn't been sent to the server yet, in order,
      // with parentId pointing to the previous message in the chat state.
      const msgs: PersistMessage[] = [];
      for (let i = 0; i < messages.length; i++) {
        const ui = messages[i];
        if (persisted.has(ui.id)) continue;
        const parent = i > 0 ? messages[i - 1].id : null;
        msgs.push({
          id: ui.id,
          parentId: parent,
          role: ui.role,
          model: usedModel,
          parts: ui.parts,
        });
      }

      // Also ensure the just-finished assistant message is included (may already be via loop)
      if (!persisted.has(message.id) && !msgs.some((m) => m.id === message.id)) {
        const idx = messages.findIndex((m) => m.id === message.id);
        msgs.push({
          id: message.id,
          parentId: idx > 0 ? messages[idx - 1].id : null,
          role: message.role,
          model: usedModel,
          parts: message.parts,
        });
      }

      if (msgs.length === 0) return;
      for (const m of msgs) if (m.id) persisted.add(m.id);
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
      if (parts.length > 0 && !remoteId) {
        // Pre-generate convId so the transport body and adapter.initialize use the same id
        setConvId(uid());
      }
      // Persistence (user + assistant) is handled in onFinish with AI SDK-assigned ids

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
  const adapterRef = useRef(
    createThreadListAdapter(queryClient, t, isLoggedIn),
  );

  // Update the adapter's isLoggedIn state when auth changes
  useEffect(() => {
    adapterRef.current = createThreadListAdapter(queryClient, t, isLoggedIn);
  }, [isLoggedIn, queryClient, t]);

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
