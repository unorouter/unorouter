"use client";
/* eslint-disable react-hooks/refs -- refs accessed during render for sync transport/adapter state */

import { createChatHistoryAdapter } from "@/components/pages/sidebar/chat/runtime/chat-history-adapter";
import { createR2AttachmentAdapter } from "@/components/pages/sidebar/chat/runtime/chat-utils";
import { createThreadListAdapter } from "@/components/pages/sidebar/chat/runtime/thread-list-adapter";
import { useAuthQuery } from "@/hooks/auth-hook";
import {
    useConversationQuery,
    useUpdateConversationMutation,
} from "@/hooks/chat-hook";
import { useLoadedMessages } from "@/hooks/ui/use-loaded-messages";
import { queryKeys } from "@/lib/react-query/keys";
import { uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import {
    chatModelAtom,
    chatStore,
    getChatDefaults,
    getChatModel,
    getChatWebSearch,
    getConvId,
    setChatHelpers,
    setConvId,
    type ChatHelpersRef,
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
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

function ChatRuntimeHook() {
  const threadId = useAuiState((s) => s.threadListItem.id);
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const setChatModel = useSetAtom(chatModelAtom);
  const queryClient = useQueryClient();
  const t = useTranslations();

  // Sync remoteId into convId synchronously (transport body reads this immediately)
  const prevRemoteIdRef = useRef<string | null | undefined>(undefined);
  const nextConvId = remoteId ?? null;
  if (prevRemoteIdRef.current !== nextConvId) {
    prevRemoteIdRef.current = nextConvId;
    setConvId(nextConvId);
  }

  // History adapter handles persistence (append) and initial load (with branch tree)
  const historyAdapterRef = useRef(
    createChatHistoryAdapter(queryClient, () => getConvId()),
  );

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
        // Used as fallback when the conversation has no settings row (guest
        // convs). Logged-in convs always have a row seeded at creation time
        // from this same value.
        overrides: getChatDefaults(),
      }),
    }),
  );

  const chat = useChat({
    id: threadId,
    transport: transportRef.current,
    onError: (e) => handleError(e, t),
    onFinish: ({ message }) => {
      const metadata = message.metadata as
        | { droppedParams?: string }
        | undefined;
      if (metadata?.droppedParams) {
        toast.warning(
          t("RP.DROPPED_PARAMS", { params: metadata.droppedParams }),
        );
      }
    },
  });

  // Keep scroll anchoring + infinite-scroll fetches alive; the history adapter now owns setMessages
  useLoadedMessages(threadId, remoteId);

  // Expose setMessages / regenerate for the assistant edit-in-place button.
  // Plain ref, not reactive: the button reads it at click time.
  setChatHelpers({
    setMessages: chat.setMessages as ChatHelpersRef["setMessages"],
    messages: chat.messages as ChatHelpersRef["messages"],
  });

  const wrappedChat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      const hasText = args[0] != null;
      if (hasText && !remoteId) {
        // Pre-generate convId so the transport body and adapter.initialize use the same id
        setConvId(uid());
      }
      return chat.sendMessage(...args);
    },
  };

  return useAISDKRuntime(wrappedChat, {
    adapters: {
      attachments: createR2AttachmentAdapter(() => ({
        convId: getConvId(),
      })),
      history: historyAdapterRef.current,
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
