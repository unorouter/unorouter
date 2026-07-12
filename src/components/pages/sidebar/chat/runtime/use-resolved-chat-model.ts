"use client";

import { useConversationQuery } from "@/hooks/ai/chat-hook";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { useHydrated } from "@/hooks/ui/use-hydrated";
import { analytics } from "@/lib/analytics";
import { USER_ID_COOKIE } from "@/lib/config/constants";
import {
  readLocalConversation,
  updateLocalConversationSettings,
} from "@/lib/db/client/data/chat/chat";
import { queryKeys } from "@/lib/react-query/keys";
import { dayjs } from "@/lib/utils/format/date";
import { chatModelAtom, chatStore, convIdAtom } from "@/store/chat-store";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useEffect } from "react";

// Single owner of chatModelAtom. Forward: resolve the atom (conv model -> pending
// pick -> free fallback), gated on hydration so the cookie-backed pick is never
// clobbered during the null hydration window. Reverse: persist atom changes to
// the conversation's defaultModel. Replaces the old useModelSync 3-way race.
export function useResolvedChatModel(remoteId: string | null | undefined) {
  const hydrated = useHydrated();
  const userId = useLocalUserId();
  const setChatModel = useSetAtom(chatModelAtom);
  const queryClient = useQueryClient();
  const pricingQuery = usePricingQuery();
  const authQuery = useAuthQuery();
  const conversationQuery = useConversationQuery(remoteId ?? undefined);
  const serverModel = conversationQuery.data?.model ?? null;

  const hasSession =
    typeof document !== "undefined" &&
    document.cookie.includes(`${USER_ID_COOKIE}=`);
  const authSettled = authQuery.isSuccess || !hasSession;

  const pricingReady = pricingQuery.isSuccess;
  const firstFreeModel = pricingQuery.data?.firstFreeModel?.name ?? null;

  useEffect(() => {
    if (!hydrated) return;
    const current = chatStore.get(chatModelAtom);

    if (remoteId && serverModel) {
      if (current !== serverModel) setChatModel(serverModel);
      return;
    }

    if (current) return;

    if (!pricingReady || !authSettled || !firstFreeModel) return;
    analytics.chat.modelAutoPicked({ to: firstFreeModel });
    setChatModel(firstFreeModel);
  }, [
    hydrated,
    remoteId,
    serverModel,
    pricingReady,
    firstFreeModel,
    authSettled,
    setChatModel,
  ]);

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
        const conv = await readLocalConversation(userId, id);
        if (!conv) return;
        await updateLocalConversationSettings(userId, {
          convId: id,
          defaultModel: newModel,
          updatedAt: dayjs().toDate(),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.chatMeta(id) });
      })();
    });
  }, [queryClient, userId]);
}
