"use client";
/* eslint-disable react-hooks/refs -- refs accessed during render for sync transport/adapter state */

import { createChatHistoryAdapter } from "@/components/pages/sidebar/chat/runtime/chat-history-adapter";
import { createLocalAttachmentAdapter } from "@/components/pages/sidebar/chat/runtime/chat-utils";
import { createThreadListAdapter } from "@/components/pages/sidebar/chat/runtime/thread-list-adapter";
import {
  useConversationQuery,
  useUpdateConversationMutation,
} from "@/hooks/ai/chat-hook";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { buildChatContextFromLocalDb } from "@/lib/db/client/data/chat-context";
import { queryKeys } from "@/lib/react-query/keys";
import type { ChatUIMessage } from "@/lib/types";
import { uid } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import {
  chatDefaultsAtom,
  chatHelpersAtom,
  chatModelAtom,
  chatStore,
  chatWebSearchAtom,
  convIdAtom,
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
  const auth = useAuthQuery();

  // Sync: transport body reads convId immediately.
  const prevRemoteIdRef = useRef<string | null | undefined>(undefined);
  const nextConvId = remoteId ?? null;
  if (prevRemoteIdRef.current !== nextConvId) {
    prevRemoteIdRef.current = nextConvId;
    chatStore.set(convIdAtom, nextConvId);
  }

  const authForHistory = useAuthQuery();
  const historyAdapterRef = useRef(
    createChatHistoryAdapter(
      queryClient,
      () => authForHistory.data?.id ?? GUEST_USER_ID,
    ),
  );

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

  useEffect(() => {
    return chatStore.sub(chatModelAtom, () => {
      const id = chatStore.get(convIdAtom);
      const newModel = chatStore.get(chatModelAtom);
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

  const userIdRef = useRef(auth.data?.id);
  userIdRef.current = auth.data?.id;

  const transportRef = useRef(
    new DefaultChatTransport({
      api: "/api/ai/chat/stream",
      body: async () => {
        const convId = chatStore.get(convIdAtom);
        return {
          model: chatStore.get(chatModelAtom),
          convId,
          webSearch: chatStore.get(chatWebSearchAtom),
          // Fallback for guest convs without a settings row.
          overrides: chatStore.get(chatDefaultsAtom),
          // SQLocal-backed: always a complete context so the server prompt
          // assembler never silently drops RP data (guest path has no DB rows).
          chatContext: convId
            ? await buildChatContextFromLocalDb(userIdRef.current, convId)
            : undefined,
        };
      },
    }),
  );

  const chat = useChat<ChatUIMessage>({
    id: threadId,
    transport: transportRef.current,
    onError: (e) => handleError(e, t),
    onFinish: ({ message }) => {
      if (message.metadata?.droppedParams) {
        toast.warning(
          t("RP.DROPPED_PARAMS", { params: message.metadata.droppedParams }),
        );
      }
    },
  });

  useEffect(() => {
    if (!remoteId) return;
    const scroller = document.querySelector("main");
    if (!scroller) return;
    let n = 0;
    const pin = () => {
      scroller.scrollTop = scroller.scrollHeight;
      if (++n < 10) requestAnimationFrame(pin);
    };
    requestAnimationFrame(pin);
  }, [threadId, remoteId]);

  // Plain ref: edit-in-place reads setMessages/regenerate at click time.
  chatStore.set(chatHelpersAtom, {
    setMessages: chat.setMessages as ChatHelpersRef["setMessages"],
    messages: chat.messages as ChatHelpersRef["messages"],
  });

  const wrappedChat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      const hasText = args[0] != null;
      if (hasText && !remoteId) {
        // Pre-generate convId so the transport body and adapter.initialize use the same id
        chatStore.set(convIdAtom, uid());
      }
      return chat.sendMessage(...args);
    },
  };

  return useAISDKRuntime(wrappedChat, {
    adapters: {
      attachments: createLocalAttachmentAdapter(() => ({
        convId: chatStore.get(convIdAtom),
        userId: auth.data?.id,
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
  const userId = authQuery.data?.id ?? GUEST_USER_ID;
  const adapterRef = useRef(createThreadListAdapter(queryClient, t, userId));

  useEffect(() => {
    adapterRef.current = createThreadListAdapter(queryClient, t, userId);
  }, [queryClient, t, userId]);

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
