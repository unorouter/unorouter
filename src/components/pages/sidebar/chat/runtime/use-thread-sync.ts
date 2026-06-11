"use client";

import { useConversationQuery } from "@/hooks/ai/chat-hook";
import { mirrorConvRowIfSynced } from "@/lib/db/client/sync/mirror";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import {
  readLocalConversation,
  updateLocalConversationSettings,
} from "@/lib/db/client/data/chat";
import { queryKeys } from "@/lib/react-query/keys";
import { dayjs } from "@/lib/utils/format/date";
import {
  chatGroupAtom,
  chatModelAtom,
  chatStore,
  convIdAtom,
} from "@/store/chat-store";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useEffect, useRef } from "react";

// Mirrors the active thread's remoteId into convIdAtom for imperative readers.
export function useConvIdSync(remoteId: string | null | undefined) {
  useEffect(() => {
    chatStore.set(convIdAtom, remoteId ?? null);
  }, [remoteId]);
}

// Two-way model sync: conv seeds atom; later atom changes patch settings-only.
export function useModelSync(remoteId: string | null | undefined) {
  const userId = useLocalUserId();
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
        await updateLocalConversationSettings(userId, {
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

// Two-way group sync: conv seeds atom; later atom changes patch settings-only.
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
        await mirrorConvRowIfSynced(userId, id);
        queryClient.invalidateQueries({ queryKey: queryKeys.chatMeta(id) });
      })();
    });
  }, [queryClient, userId]);
}

// Pin scroll on thread load. Releases on user scroll > USER_SCROLL_THRESHOLD.
const USER_SCROLL_THRESHOLD = 80;

export function useScrollToBottom(
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
