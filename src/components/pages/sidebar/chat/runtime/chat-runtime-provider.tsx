"use client";
/* eslint-disable react-hooks/refs -- refs accessed during render for sync transport/adapter state */

import { createChatHistoryAdapter } from "@/components/pages/sidebar/chat/runtime/chat-history-adapter";
import { createLocalAttachmentAdapter } from "@/components/pages/sidebar/chat/runtime/chat-utils";
import { createThreadListAdapter } from "@/components/pages/sidebar/chat/runtime/thread-list-adapter";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import {
  useConversationQuery,
  useUpdateConversationMutation,
} from "@/hooks/ai/chat-hook";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import type { ChatUIMessage } from "@/lib/types";
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
  const auth = useAuthQuery();

  // Sync: transport body reads convId immediately.
  const prevRemoteIdRef = useRef<string | null | undefined>(undefined);
  const nextConvId = remoteId ?? null;
  if (prevRemoteIdRef.current !== nextConvId) {
    prevRemoteIdRef.current = nextConvId;
    setConvId(nextConvId);
  }

  const authForHistory = useAuthQuery();
  const historyAdapterRef = useRef(
    createChatHistoryAdapter(
      queryClient,
      () => getConvId(),
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
      api: "/api/ai/chat/stream",
      body: () => {
        const convId = getConvId();
        return {
          model: getChatModel(),
          convId,
          webSearch: getChatWebSearch(),
          // Fallback for guest convs without a settings row.
          overrides: getChatDefaults(),
          // IDB-first: server falls back to Turso when this is missing (guest path).
          chatContext: convId
            ? buildChatContextFromCache(qcRef.current, convId)
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
      attachments: createLocalAttachmentAdapter(() => ({
        convId: getConvId(),
        userId: auth.data?.id ?? GUEST_USER_ID,
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
  const adapterRef = useRef(
    createThreadListAdapter(queryClient, t, userId),
  );

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
      // entries cache slot not pre-populated by hydrator; server fallback handles missing.
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
