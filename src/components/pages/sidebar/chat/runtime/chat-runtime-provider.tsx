"use client";
/* eslint-disable react-hooks/refs -- assistant-ui calls runtimeHook per render;
   transport/adapter built once in refs, latest-value refs feed async callbacks. */

import { maybeAutoContinue } from "@/components/pages/sidebar/chat/runtime/auto-continue";
import {
  createChatHistoryAdapter,
  type PersistTurn,
} from "@/components/pages/sidebar/chat/runtime/chat-history-adapter";
import { makeRoutingTransport } from "@/components/pages/sidebar/chat/runtime/routing-chat-transport";
import { createLocalAttachmentAdapter } from "@/components/pages/sidebar/chat/runtime/chat-utils";
import { computeSpeakingOrder } from "@/components/pages/sidebar/chat/runtime/group-rotation";
import { seedConversation } from "@/components/pages/sidebar/chat/runtime/conversation-seed";
import { createThreadListAdapter } from "@/components/pages/sidebar/chat/runtime/thread-list-adapter";
import { ImagePromptDialogHost } from "@/components/pages/sidebar/chat/image-prompt-dialog";
import {
  useConvIdSync,
  useSettingsSync,
} from "@/components/pages/sidebar/chat/runtime/use-thread-sync";
import { useResolvedChatModel } from "@/components/pages/sidebar/chat/runtime/use-resolved-chat-model";
import { useJsPluginLoader } from "@/hooks/ai/use-js-plugin-loader";
import { usePendingDrainScheduler } from "@/hooks/ai/use-pending-drain-scheduler";
import { analytics } from "@/lib/analytics";
import { useRoomBroadcast } from "@/lib/ai/chat/room/use-room-broadcast";
import { acquireLock, releaseLock } from "@/lib/db/client/outbox/resource-lock";
import type { ChatUIMessage } from "@/lib/types";
import { captureFailedRequest, logChatDebug } from "@/lib/utils/chat-debug-log";
import {
  classifyStreamError,
  extractErrorDetail,
  handleError,
} from "@/lib/utils/client";
import {
  assistantRuntimeAtom,
  chatLoadoutAtom,
  chatModelAtom,
  chatStore,
  convIdAtom,
  freshConvId,
  lastStreamErrorAtom,
  registerLiveThread,
  rotatingGroupTurnAtom,
  speakingCharacterIdAtom,
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
  const persistRef = useRef<PersistTurn | null>(null);
  const adapterRef = useRef(
    createChatHistoryAdapter(queryClient, getConvId, (persist) => {
      persistRef.current = persist;
    }),
  );
  return { adapter: adapterRef.current, persistRef };
}

// Registered PER CONVERSATION so a result computed for one chat cannot be
// applied to whichever thread is mounted when it lands.
function useLiveOpsBridge(
  chat: ReturnType<typeof useChat<ChatUIMessage>>,
  convId: string | null,
) {
  const clearErrorRef = useRef(chat.clearError);
  clearErrorRef.current = chat.clearError;
  const setMessagesRef = useRef(chat.setMessages);
  setMessagesRef.current = chat.setMessages;
  useEffect(() => {
    if (!convId) return;
    const ops = {
      setMessages: (updater: (msgs: unknown[]) => unknown[]) =>
        setMessagesRef.current(
          updater as Parameters<typeof setMessagesRef.current>[0],
        ),
      clearError: () => clearErrorRef.current(),
    };
    return registerLiveThread(convId, ops);
  }, [convId]);
}

function ChatRuntimeHook() {
  const threadId = useAuiState((s) => s.threadListItem.id);
  const remoteId = useAuiState((s) => s.threadListItem.remoteId);
  const t = useTranslations();
  const queryClient = useQueryClient();

  useConvIdSync(remoteId);
  useResolvedChatModel(remoteId);
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
  const history = useHistoryAdapter(getConvId);
  const historyAdapter = history.adapter;
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
      const detail = extractErrorDetail(e);
      logChatDebug("stream.error", {
        threadId,
        remoteId,
        online: navigator.onLine,
        status: detail.status ?? null,
        code: detail.code ?? null,
        requestId: detail.requestId ?? null,
        message: detail.message,
        error: String(e).slice(0, 4000),
      });
      if (!navigator.onLine) {
        toast.info(t("CHAT.QUEUED_OFFLINE"));
        return;
      }
      captureFailedRequest({
        status: detail.status,
        code: detail.code,
        requestId: detail.requestId,
        message: detail.message,
      });
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
      const parts = message.parts ?? [];
      const partText = (p: (typeof parts)[number]) =>
        "text" in p && typeof p.text === "string" ? p.text : "";
      const reasoningParts = parts.filter((p) => p.type === "reasoning").length;
      const speakerTagHits = parts
        .filter((p) => p.type === "text")
        .flatMap(
          (p) => partText(p).match(/\[[^\]\n]{1,40}\]\s*:/g) ?? [],
        ).length;
      const visibleText = parts
        .filter((p) => p.type === "text")
        .map(partText)
        .join("");
      const leakedThinkTags = (visibleText.match(/<\/?think(?:ing)?>/gi) ?? [])
        .length;
      logChatDebug("stream.finish", {
        threadId,
        remoteId,
        messageId: message.id,
        reasoningParts,
        multiReasoning: reasoningParts > 1,
        speakerTagHits,
        leakedThinkTags,
        reasoningMissing: reasoningParts === 0 && leakedThinkTags === 0,
        parts: parts.map((p) => ({
          type: p.type,
          chars: partText(p).length,
        })),
      });
      const loadout = chatStore.get(chatLoadoutAtom);
      const characterCount = loadout.characterIds.length;
      const hasLorebook = loadout.lorebookIds.length > 0;
      analytics.chat.streamCompleted({
        model: chatStore.get(chatModelAtom) ?? "unknown",
        is_first_message: markFirstChatDone(),
        is_rp: characterCount > 0,
        character_count: characterCount,
        has_persona: loadout.personaId != null,
        has_lorebook: hasLorebook,
        has_preset: loadout.presetId != null,
      });
      if (message.metadata?.summary) {
        analytics.chat.memoryFolded();
      }
      if (message.metadata?.droppedParams) {
        toast.warning(
          t("RP.DROPPED_PARAMS", { params: message.metadata.droppedParams }),
        );
      }
      if (message.metadata?.truncatedBeforeText) {
        toast.warning(t("CHAT.TRUNCATED_BEFORE_TEXT"));
      }
      void maybeAutoContinue(chat, remoteId ?? null, message);
    },
  });

  // Writing the turn NOW is what survives a stream that never terminates: the
  // completion path is otherwise the only writer and never runs.
  const persistUserTurn = async () => {
    const persist = history.persistRef.current;
    if (!persist) return;
    const last = chat.messages.at(-1);
    if (!last || last.role !== "user") return;
    try {
      await persist(last);
    } catch (e) {
      logChatDebug("history.user_turn_persist_error", {
        error: String(e).slice(0, 200),
      });
    }
  };

  const wrappedChat: typeof chat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      const hasText = args[0] != null;
      if (hasText && !remoteId) {
        // Seed BEFORE useChat snapshots its state, so the greeting rows exist
        // when the request history is captured.
        try {
          await seedConversation({
            convId: freshConvId(threadId),
            queryClient,
            noModelsError: t("ERRORS.NO_TEXT_MODELS"),
          });
        } catch (e) {
          handleError(e, t);
          return;
        }
      }
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
        const order = await computeSpeakingOrder(convId, args[0]);
        if (order.length > 1) {
          analytics.chat.groupTurn({ character_count: order.length });
          rotatingRef.current = true;
          chatStore.set(rotatingGroupTurnAtom, true);
          try {
            for (let i = 0; i < order.length; i++) {
              chatStore.set(speakingCharacterIdAtom, order[i]);
              if (i === 0) {
                const first = chat.sendMessage(...args);
                void persistUserTurn();
                await first;
              } else await chat.sendMessage();
            }
          } finally {
            chatStore.set(speakingCharacterIdAtom, null);
            chatStore.set(rotatingGroupTurnAtom, false);
            rotatingRef.current = false;
            releaseStreamLock();
          }
          return;
        }
      }
      chatStore.set(speakingCharacterIdAtom, null);
      const sent = chat.sendMessage(...args);
      void persistUserTurn();
      return sent;
    },
  };

  useLiveOpsBridge(chat, remoteId ?? null);
  useRoomBroadcast(
    chat.messages,
    chat.status === "submitted" || chat.status === "streaming",
  );

  return useAISDKRuntime(wrappedChat, {
    // assistant-ui otherwise folds a run of assistant messages into ONE bubble.
    joinStrategy: "none",
    adapters: {
      attachments: createLocalAttachmentAdapter(),
      history: historyAdapter,
    },
  });
}

export function ChatRuntimeProvider(props: { children: React.ReactNode }) {
  const params = useParams<{ convId?: string }>();
  const queryClient = useQueryClient();
  const t = useTranslations();
  usePendingDrainScheduler();
  useJsPluginLoader();
  const adapterRef = useRef(createThreadListAdapter(queryClient, t));

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: ChatRuntimeHook,
    adapter: adapterRef.current,
    initialThreadId: params.convId ?? chatStore.get(convIdAtom) ?? undefined,
  });

  useEffect(() => {
    chatStore.set(assistantRuntimeAtom, runtime);
    return () => chatStore.set(assistantRuntimeAtom, null);
  }, [runtime]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {props.children}
      <ImagePromptDialogHost />
    </AssistantRuntimeProvider>
  );
}
