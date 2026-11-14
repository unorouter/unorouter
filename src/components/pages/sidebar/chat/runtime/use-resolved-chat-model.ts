"use client";

import { useConversationQuery } from "@/hooks/ai/chat-hook";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { usePricingCatalogQuery } from "@/hooks/models/pricing-hook";
import { useHydrated } from "@/hooks/ui/use-hydrated";
import {
  readLocalConversation,
  updateLocalConversationSettings,
} from "@/lib/db/client/data/chat/chat";
import { queryKeys } from "@/lib/react-query/keys";
import { dayjs } from "@/lib/utils/format/date";
import { pickBestDeal } from "@/lib/ai/chat/best-deal";
import {
  bestDealAtom,
  chatModelAtom,
  chatStore,
  convIdAtom,
} from "@/store/chat-store";
import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";

// Single owner of chatModelAtom. Gated on hydration: writing before it clobbers the
// cookie-backed pick during the null hydration window.
export function useResolvedChatModel(remoteId: string | null | undefined) {
  const hydrated = useHydrated();
  const setChatModel = useSetAtom(chatModelAtom);
  const queryClient = useQueryClient();
  const pricingQuery = usePricingCatalogQuery();
  const authQuery = useAuthQuery();
  const conversationQuery = useConversationQuery(remoteId ?? undefined);
  const serverModel = conversationQuery.data?.defaultModel ?? null;

  const authSettled = authQuery.isSuccess;

  const pricingReady = pricingQuery.isSuccess;
  const firstFreeModel = pricingQuery.data?.first_free_model ?? null;
  const bestDeal = useAtomValue(bestDealAtom);
  const dealPick = bestDeal.enabled
    ? (pickBestDeal(pricingQuery.data?.models, bestDeal.pool)?.model_name ??
      null)
    : null;

  useEffect(() => {
    if (!hydrated) return;
    const current = chatStore.get(chatModelAtom);

    if (remoteId && serverModel) {
      if (current !== serverModel) setChatModel(serverModel);
      return;
    }

    // Only the new chat screen: an open chat keeps the model it started with.
    if (!remoteId && dealPick) {
      if (current !== dealPick) setChatModel(dealPick);
      return;
    }

    if (current) return;

    if (!pricingReady || !authSettled || !firstFreeModel) return;
    setChatModel(firstFreeModel);
  }, [
    hydrated,
    remoteId,
    serverModel,
    pricingReady,
    firstFreeModel,
    authSettled,
    dealPick,
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
        const conv = await readLocalConversation(id);
        if (!conv) return;
        await updateLocalConversationSettings({
          convId: id,
          defaultModel: newModel,
          updatedAt: dayjs().toDate(),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.chatMeta(id) });
      })();
    });
  }, [queryClient]);
}
