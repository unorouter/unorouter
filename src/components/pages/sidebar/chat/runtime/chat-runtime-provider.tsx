"use client";
/* eslint-disable react-hooks/refs -- assistant-ui calls runtimeHook per render;
   transport/adapter built once in refs, latest-value refs feed async callbacks. */

import { maybeAutoContinue } from "@/components/pages/sidebar/chat/runtime/auto-continue";
import { createChatHistoryAdapter } from "@/components/pages/sidebar/chat/runtime/chat-history-adapter";
import { useChatTransport } from "@/components/pages/sidebar/chat/runtime/chat-transport";
import { createLocalAttachmentAdapter } from "@/components/pages/sidebar/chat/runtime/chat-utils";
import { computeSpeakingOrder } from "@/components/pages/sidebar/chat/runtime/group-rotation";
import { createThreadListAdapter } from "@/components/pages/sidebar/chat/runtime/thread-list-adapter";
import {
  useConvIdSync,
  useModelSync,
  useScrollToBottom,
} from "@/components/pages/sidebar/chat/runtime/use-thread-sync";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { acquireLock, releaseLock } from "@/lib/db/client/sync/resource-lock";
import type { ChatUIMessage } from "@/lib/types";
import { handleError } from "@/lib/utils/client";
import {
  chatHelpersAtom,
  chatStore,
  convIdAtom,
  ensureConvId,
  lastStreamErrorAtom,
  speakingCharacterIdAtom,
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
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

// Same rationale as transport; ref keeps user current.
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

// Helpers bridge for edit/delete/clear/empty-send from outside the React tree.
// Receives the WRAPPED chat so sendEmpty rides the same locked send path.
function useChatHelpersBridge(chat: ReturnType<typeof useChat<ChatUIMessage>>) {
  const messagesRef = useRef(chat.messages);
  messagesRef.current = chat.messages;
  const sendRef = useRef(chat.sendMessage);
  sendRef.current = chat.sendMessage;

  const setMessages = chat.setMessages;
  useEffect(() => {
    chatStore.set(chatHelpersAtom, {
      setMessages: setMessages as ChatHelpersRef["setMessages"],
      getMessages: () => messagesRef.current as ReadonlyArray<unknown>,
      sendEmpty: async () => {
        await sendRef.current();
      },
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

  // Per-conv stream lock; released in chat onFinish/onError.
  const streamLockKeyRef = useRef<string | null>(null);
  const releaseStreamLock = () => {
    const key = streamLockKeyRef.current;
    if (!key) return;
    streamLockKeyRef.current = null;
    releaseLock(key);
  };

  const chat = useChat<ChatUIMessage>({
    id: threadId,
    transport,
    onError: (e) => {
      releaseStreamLock();
      // Offline: user turn already persisted, user resends manually (Risu
      // semantics, no auto-replay). Show "queued", not a network error; no
      // error node either, else the turn stops counting as queued/unanswered.
      if (!navigator.onLine) {
        toast.info(t("CHAT.QUEUED_OFFLINE"));
        return;
      }
      // Stash for the history adapter: the failed run's assistant message
      // persists with an error item so the attempt survives refresh.
      chatStore.set(lastStreamErrorAtom, {
        message: String((e as Error)?.message ?? e),
        at: Date.now(),
      });
      handleError(e, t);
    },
    onFinish: ({ message }) => {
      releaseStreamLock();
      if (message.metadata?.droppedParams) {
        toast.warning(
          t("RP.DROPPED_PARAMS", { params: message.metadata.droppedParams }),
        );
      }
      void maybeAutoContinue(chat, remoteId ?? null, message, auth.data?.id);
    },
  });

  useScrollToBottom(threadId, remoteId);

  const wrappedChat: typeof chat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      const hasText = args[0] != null;
      // ensureConvId idempotent; reuses attachment seed.
      if (hasText && !remoteId) ensureConvId();
      const convId = chatStore.get(convIdAtom);
      if (convId) {
        const lockKey = `conv:${convId}`;
        if (!(await acquireLock(lockKey))) {
          toast.warning(t("CHAT.GENERATION_LOCKED_OTHER_TAB"));
          return;
        }
        streamLockKeyRef.current = lockKey;
      }
      // Multi-character rotation: one visible assistant stream per speaker in
      // sequence; each send tags its speaker so the assembler promotes it to primary.
      if (hasText && convId) {
        const order = await computeSpeakingOrder(
          auth.data?.id,
          convId,
          args[0],
        );
        if (order.length > 1) {
          try {
            for (let i = 0; i < order.length; i++) {
              chatStore.set(speakingCharacterIdAtom, order[i]);
              // Only the FIRST send carries the user text; the rest continue.
              if (i === 0) await chat.sendMessage(...args);
              else await chat.sendMessage();
            }
          } finally {
            chatStore.set(speakingCharacterIdAtom, null);
          }
          return;
        }
      }
      // Offline: still send; the stream fails fast and the history adapter
      // persists the user turn as a detectable unanswered turn.
      chatStore.set(speakingCharacterIdAtom, null);
      return chat.sendMessage(...args);
    },
  };

  useChatHelpersBridge(wrappedChat);

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
  const userIdRef = useRef(authQuery.data?.id ?? GUEST_USER_ID);
  userIdRef.current = authQuery.data?.id ?? GUEST_USER_ID;
  const adapterRef = useRef(
    createThreadListAdapter(queryClient, t, () => userIdRef.current),
  );

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
