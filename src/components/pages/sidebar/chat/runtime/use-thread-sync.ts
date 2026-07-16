"use client";

import { useConversationQuery } from "@/hooks/ai/chat-hook";
import { useChatSettingsQuery } from "@/hooks/ai/rp/conversations";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import {
  readLocalConversation,
  updateLocalConversationSettings,
} from "@/lib/db/client/data/chat/chat";
import { queryKeys } from "@/lib/react-query/keys";
import type { StreamOverrides } from "@/lib/validation/chat";
import { dayjs } from "@/lib/utils/format/date";
import {
  chatDefaultsAtom,
  chatGroupAtom,
  chatStore,
  chatWebSearchAtom,
  convIdAtom,
} from "@/store/chat-store";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useEffect, useRef } from "react";

export function useConvIdSync(remoteId: string | null | undefined) {
  useEffect(() => {
    chatStore.set(convIdAtom, remoteId ?? null);
  }, [remoteId]);
}

export function useGroupSync(remoteId: string | null | undefined) {
  const userId = useLocalUserId();
  const setChatGroup = useSetAtom(chatGroupAtom);
  const queryClient = useQueryClient();
  const conversationQuery = useConversationQuery(remoteId ?? undefined);
  const lastSyncedIdRef = useRef<string | undefined>(undefined);

  const serverGroup = conversationQuery.data?.group ?? null;
  useEffect(() => {
    if (!remoteId || remoteId === lastSyncedIdRef.current) return;
    lastSyncedIdRef.current = remoteId;
    setChatGroup(serverGroup);
  }, [remoteId, serverGroup, setChatGroup]);

  useEffect(() => {
    return chatStore.sub(chatGroupAtom, () => {
      const id = chatStore.get(convIdAtom);
      const newGroup = chatStore.get(chatGroupAtom);
      if (!id) return;
      const cached = queryClient.getQueryData<{ group?: string | null }>(
        queryKeys.chatMeta(id),
      );
      if ((cached?.group ?? null) === newGroup) return;
      void (async () => {
        const conv = await readLocalConversation(userId, id);
        if (!conv) return;
        await updateLocalConversationSettings(userId, {
          convId: id,
          group: newGroup,
          updatedAt: dayjs().toDate(),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.chatMeta(id) });
      })();
    });
  }, [queryClient, userId]);
}

const OVERRIDE_KEYS = [
  "reasoningEffort",
  "temperature",
  "topP",
  "topK",
  "minP",
  "topA",
  "frequencyPenalty",
  "presencePenalty",
  "repetitionPenalty",
  "maxTokens",
  "extraBody",
  "systemPromptOverride",
  "authorNote",
  "authorNoteDepth",
  "chatMemory",
  "streamingEnabled",
  "showReasoning",
] as const;

export function useSettingsSync(remoteId: string | null | undefined) {
  const setDefaults = useSetAtom(chatDefaultsAtom);
  const setWebSearch = useSetAtom(chatWebSearchAtom);
  const settingsQuery = useChatSettingsQuery(remoteId ?? undefined);
  const lastSyncedIdRef = useRef<string | undefined>(undefined);

  const settings = settingsQuery.data;
  useEffect(() => {
    if (!remoteId || !settings || remoteId === lastSyncedIdRef.current) return;
    lastSyncedIdRef.current = remoteId;
    const overrides: StreamOverrides = {};
    const row = settings as Record<string, unknown>;
    for (const k of OVERRIDE_KEYS) {
      const v = row[k];
      if (v !== null && v !== undefined) {
        (overrides as Record<string, unknown>)[k] = v;
      }
    }
    setDefaults(overrides);
    setWebSearch(Boolean(row.webSearchEnabled));
  }, [remoteId, settings, setDefaults, setWebSearch]);
}
