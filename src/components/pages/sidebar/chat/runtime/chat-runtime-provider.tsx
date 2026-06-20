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
  useGroupSync,
  useModelSync,
  useScrollToBottom,
} from "@/components/pages/sidebar/chat/runtime/use-thread-sync";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { usePendingDrainScheduler } from "@/hooks/ai/use-pending-drain-scheduler";
import { acquireLock, releaseLock } from "@/lib/db/client/sync/resource-lock";
import type { ChatUIMessage } from "@/lib/types";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { extractErrorDetail, handleError } from "@/lib/utils/client";
import {
  chatHelpersAtom,
  chatStore,
  convIdAtom,
  ensureConvId,
  lastStreamErrorAtom,
  localUserIdAtom,
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

// getConvId is thread-scoped; the global convIdAtom would merge histories when >1 chat is open.
function useHistoryAdapter(getConvId: () => string | null) {
  const queryClient = useQueryClient();
  const adapterRef = useRef(
    createChatHistoryAdapter(
      queryClient,
      () => chatStore.get(localUserIdAtom),
      getConvId,
    ),
  );
  return adapterRef.current;
}

// Helpers bridge for edit/delete/clear/empty-send from outside the React tree. sendEmpty uses the locked send path.
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
  const userId = useLocalUserId();

  useConvIdSync(remoteId);
  useModelSync(remoteId);
  useGroupSync(remoteId);
  // Thread-scoped conv id; convIdAtom fallback covers the first send of an unsaved thread.
  const remoteIdRef = useRef<string | null>(remoteId ?? null);
  remoteIdRef.current = remoteId ?? null;
  const getConvId = () => remoteIdRef.current ?? chatStore.get(convIdAtom);
  // Log only on actual thread change, not every render.
  useEffect(() => {
    logChatDebug("thread.active", {
      threadId,
      remoteId,
      convIdAtom: chatStore.get(convIdAtom),
    });
  }, [threadId, remoteId]);
  const historyAdapter = useHistoryAdapter(getConvId);
  const transport = useChatTransport(getConvId);

  // Per-conv stream lock, released in onFinish/onError. The rotation loop holds it across speakers, so rotatingRef gates onFinish.
  const streamLockKeyRef = useRef<string | null>(null);
  const rotatingRef = useRef(false);
  const releaseStreamLock = () => {
    if (rotatingRef.current) return;
    const key = streamLockKeyRef.current;
    if (!key) return;
    streamLockKeyRef.current = null;
    releaseLock(key);
  };

  const chat = useChat<ChatUIMessage>({
    id: threadId,
    transport,
    // Transient start-trigger showAlert frames (server V1 effect).
    onData: (part) => {
      if (part.type === "data-alert") {
        const a = part.data as { kind?: string; text?: string };
        if (!a?.text) return;
        if (a.kind === "error") toast.error(a.text);
        else toast.info(a.text);
      }
    },
    onError: (e) => {
      releaseStreamLock();
      logChatDebug("stream.error", {
        threadId,
        remoteId,
        online: navigator.onLine,
        error: String(e).slice(0, 200),
      });
      // Offline: user turn already persisted, user resends manually. Show queued (no error node), still counts as unanswered.
      if (!navigator.onLine) {
        toast.info(t("CHAT.QUEUED_OFFLINE"));
        return;
      }
      // Stash for the history adapter: the failed assistant message persists with an error item (full detail) so it survives refresh.
      const detail = extractErrorDetail(e);
      chatStore.set(lastStreamErrorAtom, {
        message: detail.message,
        at: Date.now(),
        code: detail.code,
        status: detail.status,
        requestId: detail.requestId,
      });
      handleError(e, t);
    },
    onFinish: ({ message }) => {
      releaseStreamLock();
      logChatDebug("stream.finish", {
        threadId,
        remoteId,
        messageId: message.id,
      });
      if (message.metadata?.droppedParams) {
        toast.warning(
          t("RP.DROPPED_PARAMS", { params: message.metadata.droppedParams }),
        );
      }
      void maybeAutoContinue(chat, remoteId ?? null, message, userId);
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
      logChatDebug("send.start", {
        threadId,
        remoteId,
        resolvedConvId: getConvId(),
        convIdAtom: convId,
        hasText,
      });
      if (convId) {
        const lockKey = `conv:${convId}`;
        if (!(await acquireLock(lockKey))) {
          toast.warning(t("CHAT.GENERATION_LOCKED_OTHER_TAB"));
          return;
        }
        streamLockKeyRef.current = lockKey;
      }
      // Multi-character rotation: one assistant stream per speaker; each send tags its speaker for assembler promotion.
      if (hasText && convId) {
        const order = await computeSpeakingOrder(userId, convId, args[0]);
        if (order.length > 1) {
          rotatingRef.current = true;
          try {
            for (let i = 0; i < order.length; i++) {
              chatStore.set(speakingCharacterIdAtom, order[i]);
              // Only the FIRST send carries the user text; the rest continue.
              if (i === 0) await chat.sendMessage(...args);
              else await chat.sendMessage();
            }
          } finally {
            chatStore.set(speakingCharacterIdAtom, null);
            rotatingRef.current = false;
            releaseStreamLock();
          }
          return;
        }
      }
      // Offline: still send; the stream fails fast and the history adapter persists the user turn as unanswered.
      chatStore.set(speakingCharacterIdAtom, null);
      return chat.sendMessage(...args);
    },
  };

  useChatHelpersBridge(wrappedChat);

  return useAISDKRuntime(wrappedChat, {
    adapters: {
      attachments: createLocalAttachmentAdapter(() => ({
        convId: chatStore.get(convIdAtom),
      })),
      history: historyAdapter,
    },
  });
}

export function ChatRuntimeProvider(props: { children: React.ReactNode }) {
  const params = useParams<{ convId?: string }>();
  const queryClient = useQueryClient();
  const t = useTranslations();
  const userId = useLocalUserId();
  // Drives the pending-task queue (logEnrich retries); drainSoon covers the happy path post-enqueue.
  usePendingDrainScheduler(userId);
  const adapterRef = useRef(
    createThreadListAdapter(queryClient, t, () =>
      chatStore.get(localUserIdAtom),
    ),
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
