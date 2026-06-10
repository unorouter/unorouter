"use client";
/* eslint-disable react-hooks/refs -- assistant-ui calls runtimeHook per render;
   transport/adapter built once in refs, latest-value refs feed async callbacks. */

import { createChatHistoryAdapter } from "@/components/pages/sidebar/chat/runtime/chat-history-adapter";
import { createLocalAttachmentAdapter } from "@/components/pages/sidebar/chat/runtime/chat-utils";
import { createThreadListAdapter } from "@/components/pages/sidebar/chat/runtime/thread-list-adapter";
import { useConversationQuery } from "@/hooks/ai/chat-hook";
import { mirrorConvRowIfSynced } from "@/hooks/ai/rp/shared";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { groupOrder } from "@/lib/ai/chat/group-order";
import { GUEST_USER_ID } from "@/lib/config/constants";
import {
  readLocalConversation,
  readLocalConversationBindings,
  readLocalConversationSettings,
  readLocalMessages,
  upsertLocalConversationSettings,
} from "@/lib/db/client/data/chat";
import { readLocalCharacter } from "@/lib/db/client/data/rp";
import { acquireLock, releaseLock } from "@/lib/db/client/sync/resource-lock";
import { queryKeys } from "@/lib/react-query/keys";
import type { ChatUIMessage } from "@/lib/types";
import { fnv1aHex } from "@/lib/utils/base";
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
  globalVarsAtom,
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
import { DefaultChatTransport } from "ai";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

// Mirrors the active thread's remoteId into convIdAtom for imperative readers.
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
        // Settings FK needs the parent conv row; before initialize() seeds it,
        // bail and let initialize read chatModelAtom directly.
        const conv = await readLocalConversation(userId, id);
        if (!conv) return;
        await upsertLocalConversationSettings(userId, {
          convId: id,
          defaultModel: newModel,
          updatedAt: dayjs().toDate(),
        });
        await mirrorConvRowIfSynced(userId, id);
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
        // Dynamic: the RP context builder drags lorebook/trigger machinery
        // (~110KB gzip) that must not sit in the page's first-paint chunks.
        const baseContext = convId
          ? await import("@/lib/db/client/data/chat-context").then((m) =>
              m.buildChatContextFromLocalDb(userIdRef.current, convId),
            )
          : undefined;
        // Context-dedup handshake: full payload only when the fingerprint changed,
        // else just the hash (server LRU; a miss 409s and the fetch wrapper retries
        // full). globalVars ride outside the hash: they change every setglobalvar.
        let chatContext: typeof baseContext;
        let chatContextHash: string | undefined;
        if (convId && baseContext) {
          chatContextHash = fnv1aHex(JSON.stringify(baseContext));
          lastContextRef.current.set(convId, {
            hash: chatContextHash,
            ctx: baseContext,
          });
          if (sentContextHashes.get(convId) !== chatContextHash) {
            chatContext = baseContext;
            sentContextHashes.set(convId, chatContextHash);
          }
        } else {
          chatContext = baseContext;
        }
        return {
          model: chatStore.get(chatModelAtom),
          convId,
          webSearch: chatStore.get(chatWebSearchAtom),
          // Guest fallback.
          overrides: chatStore.get(chatDefaultsAtom),
          chatContext,
          chatContextHash,
          globalVars: chatStore.get(globalVarsAtom),
          // Speaking character for this stream (multi-character rotation).
          speakingCharacterId: chatStore.get(speakingCharacterIdAtom),
        };
      },
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const res = await fetch(input, init);
        if (res.status !== 409 || typeof init?.body !== "string") return res;
        const payload = await res
          .clone()
          .json()
          .catch(() => null);
        if (payload?.code !== "context-required") return res;
        // Server lost the cached context: retry once with the full payload.
        const body = JSON.parse(init.body) as Record<string, unknown> & {
          convId?: string | null;
        };
        const last = body.convId
          ? lastContextRef.current.get(body.convId)
          : undefined;
        if (!last) return res;
        body.chatContext = last.ctx;
        body.chatContextHash = last.hash;
        return fetch(input, { ...init, body: JSON.stringify(body) });
      },
      // With memory off the server only consumes a window; trim to a generous
      // superset of all consumers. Rolling-summary convs need absolute indices, send full.
      prepareSendMessagesRequest: (opts) => {
        const body = (opts.body ?? {}) as Record<string, unknown> & {
          chatContext?: {
            settings?: {
              memoryEnabled?: boolean | null;
              summaryAnchor?: number | null;
              chatMemory?: number | null;
            };
            lorebooks?: Array<{ lorebook?: { scanDepth?: number | null } }>;
          };
        };
        const settings = body.chatContext?.settings;
        const memoryOn =
          settings?.memoryEnabled === true ||
          (settings?.summaryAnchor ?? 0) > 0;
        let messages = opts.messages;
        if (!memoryOn && messages.length > 64) {
          const maxScan = Math.max(
            4,
            ...(body.chatContext?.lorebooks ?? []).map(
              (l) => l.lorebook?.scanDepth ?? 4,
            ),
          );
          const keep = Math.max(
            64,
            (settings?.chatMemory ?? 8) * 2,
            maxScan * 2,
          );
          if (messages.length > keep) messages = messages.slice(-keep);
        }
        return {
          body: {
            ...body,
            id: opts.id,
            messages,
            trigger: opts.trigger,
            messageId: opts.messageId,
          },
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

// Context-dedup handshake state: hash last SENT per conv (skip re-upload) and
// the last BUILT context per conv (the 409 retry needs the full payload).
const sentContextHashes = new Map<string, string>();
const lastContextRef = {
  current: new Map<string, { hash: string; ctx: unknown }>(),
};

// Auto-continue chain depth per conv, so a model that never ends on terminal
// punctuation cannot loop forever. Reset when a finished reply DOES terminate.
const autoContinueDepth = new Map<string, number>();
const MAX_AUTO_CONTINUE = 3;

// RisuAI isLastCharPunctuation port: broad set (incl. `*`/`~` so `*smiles*` is
// terminal) plus U+02B0-02FF; a narrow set causes spurious auto-continues.
const TERMINAL_PUNCTUATION = new Set([
  ".",
  "!",
  "?",
  "。",
  "！",
  "？",
  "…",
  "@",
  "#",
  "$",
  "%",
  "^",
  "&",
  "*",
  "(",
  ")",
  "-",
  "_",
  "+",
  "=",
  "{",
  "}",
  "[",
  "]",
  "|",
  "\\",
  ":",
  ";",
  "<",
  ">",
  ",",
  "/",
  "~",
  "`",
  " ",
  "¡",
  "¿",
  "‽",
  "⁉",
  "'",
  '"',
  "”",
  "’",
  "】",
  "」",
  "』",
]);

function endsTerminally(text: string): boolean {
  const last = text.trim().at(-1);
  if (!last) return true;
  if (TERMINAL_PUNCTUATION.has(last)) return true;
  const code = last.charCodeAt(0);
  return code >= 0x02b0 && code <= 0x02ff;
}

// Plain text from a sendMessage() arg, for the group-order name-mention scan.
function sendArgText(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg && typeof arg === "object") {
    const o = arg as {
      text?: string;
      parts?: { type: string; text?: string }[];
    };
    if (typeof o.text === "string") return o.text;
    if (Array.isArray(o.parts)) {
      return o.parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text)
        .join(" ");
    }
  }
  return "";
}

// Ordered character ids; length <= 1 means single-stream, no rotation.
async function computeSpeakingOrder(
  userId: number | undefined,
  convId: string,
  sendArg: unknown,
): Promise<string[]> {
  const settings = await readLocalConversationSettings(userId, convId);
  const bindings = await readLocalConversationBindings(userId, convId);
  const active = (bindings?.conversationCharacters ?? []).filter(
    (b) => b.isActive !== false,
  );
  if (active.length <= 1) return active.map((b) => b.characterId);

  const members = await Promise.all(
    active.map(async (b) => {
      const ch = await readLocalCharacter(userId, b.characterId);
      return {
        id: b.characterId,
        name: (ch as { name?: string } | null)?.name ?? "",
        // null -> groupOrder's Risu default (0.5).
        talkness:
          typeof (b as { talkness?: number }).talkness === "number"
            ? (b as { talkness: number }).talkness
            : null,
        orderIndex: b.orderIndex ?? 0,
      };
    }),
  );
  // Last speaker, for the random mode's no-back-to-back filter.
  const rows = await readLocalMessages(userId, convId);
  const lastSpeakerId =
    [...(rows ?? [])]
      .reverse()
      .find((m) => m.role === "assistant" && m.characterId)?.characterId ??
    null;
  return groupOrder(members, sendArgText(sendArg), {
    orderByOrder:
      (settings as { groupOrderByOrder?: boolean } | null)
        ?.groupOrderByOrder === true,
    lastSpeakerId,
  }).map((m) => m.id);
}

async function maybeAutoContinue(
  chat: { sendMessage: (...args: never[]) => Promise<void> },
  remoteId: string | null,
  message: ChatUIMessage,
  userId: number | undefined,
): Promise<void> {
  if (!remoteId) return;
  // Don't auto-continue mid-rotation: the multi-character loop drives its own
  // sequential sends and clears the speaking atom when done.
  if (chatStore.get(speakingCharacterIdAtom) != null) return;
  const text = message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("");
  if (!text.trim() || endsTerminally(text)) {
    autoContinueDepth.delete(remoteId);
    return;
  }
  const settings = await readLocalConversationSettings(userId, remoteId);
  if (
    !settings ||
    (settings as { autoContinue?: boolean }).autoContinue !== true
  ) {
    return;
  }
  const depth = autoContinueDepth.get(remoteId) ?? 0;
  if (depth >= MAX_AUTO_CONTINUE) {
    autoContinueDepth.delete(remoteId);
    return;
  }
  autoContinueDepth.set(remoteId, depth + 1);
  // Continuation send, not regenerate (which would discard the truncated reply):
  // argless sendMessage re-submits history ending on assistant, model appends.
  await chat.sendMessage();
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
        if (!acquireLock(lockKey)) {
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
