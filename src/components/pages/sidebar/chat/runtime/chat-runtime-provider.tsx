"use client";
/* eslint-disable react-hooks/refs -- assistant-ui calls runtimeHook per render
   without remounting; transport/adapter must be built once and read from a ref
   during render, and latest-value refs feed async stream/transport callbacks. */

import { createChatHistoryAdapter } from "@/components/pages/sidebar/chat/runtime/chat-history-adapter";
import { createLocalAttachmentAdapter } from "@/components/pages/sidebar/chat/runtime/chat-utils";
import { createThreadListAdapter } from "@/components/pages/sidebar/chat/runtime/thread-list-adapter";
import { useConversationQuery } from "@/hooks/ai/chat-hook";
import { mirrorConvSettingsIfSynced } from "@/hooks/ai/rp/shared";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { GUEST_USER_ID } from "@/lib/config/constants";
import {
  readLocalConversation,
  upsertLocalConversationSettings,
} from "@/lib/db/client/data/chat";
import { buildChatContextFromLocalDb } from "@/lib/db/client/data/chat-context";
import {
  acquireLock,
  releaseLock,
} from "@/lib/db/client/sync/resource-lock";
import { queryKeys } from "@/lib/react-query/keys";
import type { ChatUIMessage } from "@/lib/types";
import { handleError } from "@/lib/utils/client";
import { dayjs } from "@/lib/utils/format/date";
import {
  chatDefaultsAtom,
  chatHelpersAtom,
  chatModelAtom,
  chatStore,
  chatWebSearchAtom,
  convIdAtom,
  ensureConvId,
  queuedReplayAtom,
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
import { useAtomValue, useSetAtom } from "jotai";
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

// Two-way model sync: conv seeds atom; later atom changes patch settings-only.
function useModelSync(remoteId: string | null | undefined) {
  const auth = useAuthQuery();
  const setChatModel = useSetAtom(chatModelAtom);
  const queryClient = useQueryClient();
  const conversationQuery = useConversationQuery(remoteId ?? undefined);
  const lastSyncedIdRef = useRef<string | undefined>(undefined);

  const serverModel = conversationQuery.data?.model;
  useEffect(() => {
    if (!remoteId || !serverModel || remoteId === lastSyncedIdRef.current)
      return;
    lastSyncedIdRef.current = remoteId;
    setChatModel(serverModel);
  }, [remoteId, serverModel, setChatModel]);

  const userId = auth.data?.id;
  useEffect(() => {
    return chatStore.sub(chatModelAtom, () => {
      const id = chatStore.get(convIdAtom);
      const newModel = chatStore.get(chatModelAtom);
      if (!id || !newModel) return;
      const cached = queryClient.getQueryData<{ model?: string }>(
        queryKeys.chatMeta(id),
      );
      if (cached?.model === newModel) return;
      void (async () => {
        // conversation_settings.conv_id FK requires the parent conv row.
        // Initial model picker can fire before initialize() seeds it; bail
        // and let initialize seed model from chatModelAtom directly.
        const conv = await readLocalConversation(userId, id);
        if (!conv) return;
        await upsertLocalConversationSettings(userId, {
          convId: id,
          defaultModel: newModel,
          updatedAt: dayjs().toDate(),
        });
        await mirrorConvSettingsIfSynced(userId, id, {
          defaultModel: newModel,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.chatMeta(id) });
      })();
    });
  }, [queryClient, userId]);
}

// Built once; userIdRef refreshed each render for live user in async body.
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
          // Guest fallback.
          overrides: chatStore.get(chatDefaultsAtom),
          // SQLocal-backed: always complete context, no silent RP drop.
          chatContext: convId
            ? await buildChatContextFromLocalDb(userIdRef.current, convId)
            : undefined,
        };
      },
    }),
  );
  return transportRef.current;
}

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

// Pin scroll on thread load. Releases on user scroll > USER_SCROLL_THRESHOLD.
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

// Per-tab guard so online/visibility/interval triggers do not stack duplicate
// regenerates for the same conversation before the first finishes.
const replayInFlight = new Set<string>();

// Drains queued offline sends for the ACTIVE thread only. The scheduler
// publishes unanswered-turn convIds to queuedReplayAtom; when one matches the
// open conversation and nothing is streaming, regenerate from the user leaf
// (regenerate keeps a trailing user message and re-requests -> assistant reply
// persists via the normal append). Non-active convs replay when opened. Costs
// stay visible: no hidden multi-stream fan-out.
function useQueuedReplayBridge(
  chat: ReturnType<typeof useChat<ChatUIMessage>>,
  remoteId: string | null | undefined,
  streamLockKeyRef: React.RefObject<string | null>,
  releaseStreamLock: () => void,
) {
  const queued = useAtomValue(queuedReplayAtom);
  const status = chat.status;
  const regenerate = chat.regenerate;

  useEffect(() => {
    if (!remoteId) return;
    if (!queued.includes(remoteId)) return;
    // Only when idle; never interrupt an in-flight stream.
    if (status === "submitted" || status === "streaming") return;
    if (!navigator.onLine) return;
    if (replayInFlight.has(remoteId)) return;

    const lockKey = `conv:${remoteId}`;
    if (!acquireLock(lockKey)) return; // another tab owns this conv
    streamLockKeyRef.current = lockKey;
    replayInFlight.add(remoteId);

    void regenerate()
      .catch(() => {
        // Failure leaves the unanswered turn in place; it retries on next
        // online/visibility tick. onError already surfaced the toast + lock.
      })
      .finally(() => {
        replayInFlight.delete(remoteId);
        // Release here too in case the run resolved without onFinish/onError.
        if (streamLockKeyRef.current === lockKey) releaseStreamLock();
      });
  }, [queued, remoteId, status, regenerate, streamLockKeyRef, releaseStreamLock]);
}

// Stable helpers bridge for edit/delete + clear-conv from outside React tree.
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
      // Offline send failure is expected: the user turn was persisted by the
      // history adapter and will auto-replay on reconnect. Show "queued", not
      // a scary network error.
      if (!navigator.onLine) {
        toast.info(t("CHAT.QUEUED_OFFLINE"));
        return;
      }
      handleError(e, t);
    },
    onFinish: ({ message }) => {
      releaseStreamLock();
      if (message.metadata?.droppedParams) {
        toast.warning(
          t("RP.DROPPED_PARAMS", { params: message.metadata.droppedParams }),
        );
      }
    },
  });

  useScrollToBottom(threadId, remoteId);
  useChatHelpersBridge(chat);
  useQueuedReplayBridge(chat, remoteId, streamLockKeyRef, releaseStreamLock);

  const wrappedChat: typeof chat = {
    ...chat,
    sendMessage: async (...args: Parameters<typeof chat.sendMessage>) => {
      const hasText = args[0] != null;
      // ensureConvId idempotent; reuses attachment seed.
      if (hasText && !remoteId) ensureConvId();
      const convId = chatStore.get(convIdAtom);
      if (convId) {
        const lockKey = `conv:${convId}`;
        if (!acquireLock(lockKey)) {
          toast.warning(t("CHAT.GENERATION_LOCKED_OTHER_TAB"));
          return;
        }
        streamLockKeyRef.current = lockKey;
      }
      // Offline: still call sendMessage. It pushes the user message into the
      // thread and attempts the stream, which fails fast; the history adapter
      // persists the user turn on the run transition, making it a detectable
      // unanswered turn for replay. onError shows the "queued" toast.
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
