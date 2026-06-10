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
        // Dynamic: the RP context builder drags lorebook/trigger machinery
        // (~110KB gzip) that must not sit in the page's first-paint chunks.
        const baseContext = convId
          ? await import("@/lib/db/client/data/chat-context").then((m) =>
              m.buildChatContextFromLocalDb(userIdRef.current, convId),
            )
          : undefined;
        // Context-dedup handshake: the RP context (cards + lorebooks) is the
        // heaviest part of every send and rarely changes between turns. Send
        // the full payload only when its fingerprint changed since the last
        // send for this conv; otherwise just the hash (server keeps an LRU
        // copy; a server-side miss 409s and the fetch wrapper retries full).
        // globalVars ride OUTSIDE the hash: they change every setglobalvar.
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
          // Multi-character rotation: the speaking character for THIS stream.
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
        // Server lost/never had the cached context (restart, eviction, other
        // instance): retry ONCE with the full payload.
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
      // History upload window: useChat ships the FULL message list every send,
      // but with memory OFF the server only consumes a window (chatMemory cap
      // for the model, scanDepth for lorebooks, ~32 recent texts for triggers).
      // Trim to a generous superset of all consumers. Rolling-summary convs
      // (memory on or an existing anchor) need absolute indices -> send full.
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

// RisuAI isLastCharPunctuation port (util.ts:524): broad set incl. `*` and `~`
// so RP replies ending `*smiles*` count as terminal, plus spacing-modifier
// letters (U+02B0-02FF). A narrow set causes spurious auto-continues.
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

// Pull plain text out of a sendMessage() argument (string, {text}, or a
// parts/message object) for the group-order name-mention scan.
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

// Compute the speaking order for a multi-character conversation. Returns the
// ordered character ids (length <= 1 means single-stream, no rotation).
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

  // Resolve names for the mention scan.
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
  // Last speaker (most recent assistant turn's character) for the
  // no-back-to-back filter in the random mode.
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
  // Continuation send, NOT regenerate: regenerate would DISCARD the truncated
  // reply and start over. An argless sendMessage re-submits the history ending
  // on the assistant turn, so the model appends a continuation (same mechanism
  // as the multi-character rotation's follow-up sends).
  await chat.sendMessage();
}

// Stable helpers bridge for edit/delete/clear-conv/empty-send from outside the
// React tree. Receives the WRAPPED chat so sendEmpty rides the same locked
// send path as a normal message (Risu sendMain: one send function for both).
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
      // Offline send failure: the user turn is persisted by the history
      // adapter; the user resends manually when back online (Risu semantics:
      // fail loudly, no auto-replay). Show "queued", not a network error.
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
      // Auto-continue (RisuAI): when the conv opts in and the reply ends without
      // terminal punctuation, regenerate to continue. Bounded per conv so a
      // model that never punctuates can't loop forever.
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
      // Multi-character rotation: when the conversation has >1 active character,
      // compute the speaking order and fire one VISIBLE assistant stream per
      // speaker in sequence (cost stays on-screen; no hidden fan-out). Each send
      // tags its speaking character so the assembler promotes it to primary.
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
      // Offline: still call sendMessage. It pushes the user message into the
      // thread and attempts the stream, which fails fast; the history adapter
      // persists the user turn on the run transition, making it a detectable
      // unanswered turn for replay. onError shows the "queued" toast.
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
