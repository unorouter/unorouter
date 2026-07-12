"use client";
/* eslint-disable react-hooks/refs -- assistant-ui calls runtimeHook per render;
   transport/adapter built once in refs, latest-value refs feed async callbacks. */

import { maybeAutoContinue } from "@/components/pages/sidebar/chat/runtime/auto-continue";
import { createChatHistoryAdapter } from "@/components/pages/sidebar/chat/runtime/chat-history-adapter";
import { makeRoutingTransport } from "@/components/pages/sidebar/chat/runtime/routing-chat-transport";
import { createLocalAttachmentAdapter } from "@/components/pages/sidebar/chat/runtime/chat-utils";
import { computeSpeakingOrder } from "@/components/pages/sidebar/chat/runtime/group-rotation";
import { createThreadListAdapter } from "@/components/pages/sidebar/chat/runtime/thread-list-adapter";
import { ImagePromptDialogHost } from "@/components/pages/sidebar/chat/image-prompt-dialog";
import {
  useConvIdSync,
  useGroupSync,
  useScrollToBottom,
  useSettingsSync,
} from "@/components/pages/sidebar/chat/runtime/use-thread-sync";
import { useResolvedChatModel } from "@/components/pages/sidebar/chat/runtime/use-resolved-chat-model";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { usePendingDrainScheduler } from "@/hooks/ai/use-pending-drain-scheduler";
import { analytics } from "@/lib/analytics";
import { acquireLock, releaseLock } from "@/lib/db/client/outbox/resource-lock";
import type { ChatUIMessage } from "@/lib/types";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import {
  classifyStreamError,
  extractErrorDetail,
  handleError,
} from "@/lib/utils/client";
import {
  chatHelpersAtom,
  chatModelAtom,
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

// Activation signal: true the first time a chat stream completes on this device.
// localStorage-backed so a reload does not re-flag; per-device is fine for an
// aha-moment metric (identity stitching happens PostHog-side via distinctId).
const FIRST_CHAT_KEY = "uno_first_chat_done";
function markFirstChatDone(): boolean {
  try {
    if (localStorage.getItem(FIRST_CHAT_KEY)) return false;
    localStorage.setItem(FIRST_CHAT_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

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
  useResolvedChatModel(remoteId);
  useGroupSync(remoteId);
  useSettingsSync(remoteId);
  const remoteIdRef = useRef<string | null>(remoteId ?? null);
  remoteIdRef.current = remoteId ?? null;
  const getConvId = () => remoteIdRef.current ?? chatStore.get(convIdAtom);
  useEffect(() => {
    logChatDebug("thread.active", {
      threadId,
      remoteId,
      convIdAtom: chatStore.get(convIdAtom),
    });
  }, [threadId, remoteId]);
  const historyAdapter = useHistoryAdapter(getConvId);
  const transportRef = useRef<ReturnType<typeof makeRoutingTransport> | null>(
    null,
  );
  if (transportRef.current === null) {
    transportRef.current = makeRoutingTransport(getConvId);
  }
  const transport = transportRef.current;

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
      if (!navigator.onLine) {
        toast.info(t("CHAT.QUEUED_OFFLINE"));
        return;
      }
      const detail = extractErrorDetail(e);
      analytics.chat.streamFailed({
        error_type: classifyStreamError(detail),
        status: detail.status ?? null,
        code: detail.code ?? null,
      });
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
      analytics.chat.streamCompleted({
        model: chatStore.get(chatModelAtom) ?? "unknown",
        is_first_message: markFirstChatDone(),
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
      if (hasText && convId) {
        const order = await computeSpeakingOrder(userId, convId, args[0]);
        if (order.length > 1) {
          rotatingRef.current = true;
          try {
            for (let i = 0; i < order.length; i++) {
              chatStore.set(speakingCharacterIdAtom, order[i]);
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
      <ImagePromptDialogHost />
    </AssistantRuntimeProvider>
  );
}
