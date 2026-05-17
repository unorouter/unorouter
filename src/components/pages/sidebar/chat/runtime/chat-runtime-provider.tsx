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

  const qcRef = useRef(queryClient);
  qcRef.current = queryClient;

  const transportRef = useRef(
    new DefaultChatTransport({
      api: "/api/chat/stream",
      body: () => {
        const convId = getConvId();
        return {
          model: getChatModel(),
          convId,
          webSearch: getChatWebSearch(),
          // Used as fallback when the conversation has no settings row (guest
          // convs). Logged-in convs always have a row seeded at creation time
          // from this same value.
          overrides: getChatDefaults(),
          // IDB-first chat context: read whatever the hydrator + per-row
          // queries have populated into React Query. Server falls back to
          // Turso when this is missing (guest path).
          chatContext: convId
            ? buildChatContextFromCache(qcRef.current, convId)
            : undefined,
        };
      },
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

// ---------------------------------------------------------------------------
// Synchronous chatContext builder. Reads from React Query cache only - the
// transport `body` callback runs sync. The cache is populated by IDB-first
// hooks + the SyncStateHydrator stage 1+2 pass, so everything we need is
// already there for synced + local-only conversations. Returns null fields
// when data is missing; server falls back to Turso reads in that case.
// ---------------------------------------------------------------------------
function buildChatContextFromCache(
  qc: ReturnType<typeof useQueryClient>,
  convId: string,
) {
  const settings = qc.getQueryData(queryKeys.chatSettings(convId)) as
    | Record<string, unknown>
    | undefined;
  if (!settings) return undefined;

  const bindings = qc.getQueryData(queryKeys.chatBindings(convId)) as
    | {
        characters?: Array<{ characterId: string }>;
        lorebooks?: Array<{ lorebookId: string }>;
      }
    | undefined;

  const allChars = (qc.getQueryData(queryKeys.characters()) ?? []) as Array<{
    id: string;
  }>;
  const allLorebooks = (qc.getQueryData(queryKeys.lorebooks()) ?? []) as Array<{
    id: string;
  }>;
  const allPersonas = (qc.getQueryData(queryKeys.personas()) ?? []) as Array<{
    id: string;
  }>;
  const allPresets = (qc.getQueryData(queryKeys.presets()) ?? []) as Array<{
    id: string;
  }>;

  const characters = (bindings?.characters ?? [])
    .map((b) => allChars.find((c) => c.id === b.characterId))
    .filter((c): c is NonNullable<typeof c> => !!c);

  const lorebooks = (bindings?.lorebooks ?? [])
    .map((b) => {
      const lb = allLorebooks.find((l) => l.id === b.lorebookId);
      if (!lb) return null;
      // entries live in their own per-lorebook cache slot; the hydrator
      // does not pre-populate them yet. Server-side fallback handles
      // missing entries gracefully.
      const detail = qc.getQueryData(queryKeys.lorebook(b.lorebookId)) as
        | { entries?: unknown[] }
        | undefined;
      return { lorebook: lb, entries: detail?.entries ?? [] };
    })
    .filter((l): l is NonNullable<typeof l> => !!l);

  const personaId = settings.personaId as string | null | undefined;
  const presetId = settings.presetId as string | null | undefined;
  const persona = personaId
    ? (allPersonas.find((p) => p.id === personaId) ?? null)
    : null;
  const preset = presetId
    ? (allPresets.find((p) => p.id === presetId) ?? null)
    : null;

  return { persona, characters, lorebooks, preset, settings };
}
