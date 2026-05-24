"use client";
/* eslint-disable react-hooks/refs -- assistant-ui calls runtimeHook per render
   without remounting; transport/adapter must be built once and read from a ref
   during render, and latest-value refs feed async stream/transport callbacks. */

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
import { handleError } from "@/lib/utils/client";
import {
  chatDefaultsAtom,
  chatHelpersAtom,
  chatModelAtom,
  chatStore,
  chatWebSearchAtom,
  convIdAtom,
  ensureConvId,
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

// Mirrors the active thread's remoteId into convIdAtom so the transport body
// and adapters (which read convId imperatively) see the current conversation.
function useConvIdSync(remoteId: string | null | undefined) {
  useEffect(() => {
    chatStore.set(convIdAtom, remoteId ?? null);
  }, [remoteId]);
}

// Two-way model sync: server conversation model seeds the atom on thread load;
// later atom changes (model picker) push back to the server conversation.
function useModelSync(remoteId: string | null | undefined) {
  const setChatModel = useSetAtom(chatModelAtom);
  const queryClient = useQueryClient();
  const conversationQuery = useConversationQuery(remoteId ?? undefined);
  const updateModel = useUpdateConversationMutation().mutate;
  const lastSyncedIdRef = useRef<string | undefined>(undefined);

  const serverModel = conversationQuery.data?.model;
  useEffect(() => {
    if (!remoteId || !serverModel || remoteId === lastSyncedIdRef.current)
      return;
    lastSyncedIdRef.current = remoteId;
    setChatModel(serverModel);
  }, [remoteId, serverModel, setChatModel]);

  useEffect(() => {
    return chatStore.sub(chatModelAtom, () => {
      const id = chatStore.get(convIdAtom);
      const newModel = chatStore.get(chatModelAtom);
      if (!id || !newModel) return;
      const cached = queryClient.getQueryData<{ model?: string }>(
        queryKeys.chatMeta(id),
      );
      if (cached?.model === newModel) return;
      updateModel({ id, body: { model: newModel } });
    });
  }, [queryClient, updateModel]);
}

// Built once: assistant-ui calls the runtime hook per render but never
// remounts it, so the ref holds for the component's lifetime. The body
// callback reads live atom state at send time; userIdRef is refreshed each
// render so the async callback sees the current user.
function useChatTransport() {
  const auth = useAuthQuery();
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
  return transportRef.current;
}

// Built once for the same reason as the transport. userIdRef is refreshed
// each render so the adapter's thunk reads the current user (the adapter
// itself closes over the first-render auth object otherwise).
function useHistoryAdapter() {
  const auth = useAuthQuery();
  const queryClient = useQueryClient();
  const userIdRef = useRef(auth.data?.id);
  userIdRef.current = auth.data?.id;

  const adapterRef = useRef(
    createChatHistoryAdapter(
      queryClient,
      () => userIdRef.current ?? GUEST_USER_ID,
    ),
  );
  return adapterRef.current;
}

// Pins the scroll to the bottom when a thread loads. Multiple frames cover
// late layout passes while history renders.
//
// Bails on user scroll: once the user moves more than USER_SCROLL_THRESHOLD
// pixels away from the bottom mid-load, we stop fighting them.
const USER_SCROLL_THRESHOLD = 80;

function useScrollToBottom(
  threadId: string | null | undefined,
  remoteId: string | null | undefined,
) {
  useEffect(() => {
    if (!remoteId) return;
    const scroller = document.querySelector("main");
    if (!scroller) return;
    let n = 0;
    let lastTarget = scroller.scrollHeight;
    const pin = () => {
      const distanceFromBottom =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      // User scrolled up; release the pin.
      if (
        scroller.scrollTop < lastTarget - USER_SCROLL_THRESHOLD &&
        distanceFromBottom > USER_SCROLL_THRESHOLD
      ) {
        return;
      }
      scroller.scrollTop = scroller.scrollHeight;
      lastTarget = scroller.scrollHeight;
      if (++n < 10) requestAnimationFrame(pin);
    };
    requestAnimationFrame(pin);
  }, [threadId, remoteId]);
}

// Publishes a stable helpers bridge so edit/delete handlers (thread.tsx) and
// the clear-conversation mutation can reach useChat. setMessages is stable;
// getMessages reads a ref kept current each render, so the atom is written
// once instead of on every streamed token.
function useChatHelpersBridge(chat: ReturnType<typeof useChat<ChatUIMessage>>) {
  const messagesRef = useRef(chat.messages);
  messagesRef.current = chat.messages;

  const setMessages = chat.setMessages;
  useEffect(() => {
    chatStore.set(chatHelpersAtom, {
      setMessages: setMessages as ChatHelpersRef["setMessages"],
      getMessages: () => messagesRef.current as ReadonlyArray<unknown>,
    });
    return () => chatStore.set(chatHelpersAtom, null);
  }, [setMessages]);
}

function ChatRuntimeHook() {
  const threadId = useAuiState((s) => s.threadListItem.id);
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const t = useTranslations();
  const auth = useAuthQuery();

  useConvIdSync(remoteId);
  useModelSync(remoteId);
  const historyAdapter = useHistoryAdapter();
  const transport = useChatTransport();

  const chat = useChat<ChatUIMessage>({
    id: threadId,
    transport,
    onError: (e) => handleError(e, t),
    onFinish: ({ message }) => {
      if (message.metadata?.droppedParams) {
        toast.warning(
          t("RP.DROPPED_PARAMS", { params: message.metadata.droppedParams }),
        );
      }
    },
  });

  useScrollToBottom(threadId, remoteId);
  useChatHelpersBridge(chat);

  const wrappedChat: typeof chat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      const hasText = args[0] != null;
      if (hasText && !remoteId) {
        // Pre-generate convId so the transport body and adapter.initialize
        // use the same id. ensureConvId is idempotent: if the attachment
        // adapter already seeded one, we reuse it instead of allocating a
        // second id and orphaning the attachment row.
        ensureConvId();
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
      history: historyAdapter,
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
