"use client";

import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenQuery } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import type { UserSelfData } from "@/openapi";

export function usePartnerGiftCardsQuery(
  query?: EdenQuery<typeof rpc.api.billing.partner.redemption>,
) {
  return useElysiaQuery(queryKeys.partnerGiftCards(query), () =>
    rpc.api.billing.partner.redemption.get({ query }),
  );
}

// Minting spends the partner's own balance, so the cached wallet is decremented
// optimistically the same way the affiliate transfer does.
export function useCreateGiftCardMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.billing.partner.redemption, "post">,
    ) => handleElysia(await rpc.api.billing.partner.redemption.post(args.body)),
    onSuccess: (_, args, qc) => {
      qc.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old ? { ...old, quota: (old.quota ?? 0) - args.body.quota } : old,
      );
    },
    invalidates: [queryKeys.partnerGiftCards()],
  });
}

// Voiding returns the card's full face value, so the cached balance goes back up
// by exactly what minting took out.
export function useVoidGiftCardMutation() {
  return useApiMutation({
    mutationFn: async (args: { id: number; quota: number }) =>
      handleElysia(
        await rpc.api.billing.partner.redemption({ id: String(args.id) }).delete(),
      ),
    onSuccess: (_, args, qc) => {
      qc.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old ? { ...old, quota: (old.quota ?? 0) + args.quota } : old,
      );
    },
    invalidates: [queryKeys.partnerGiftCards()],
  });
}

export function useGrantQuotaMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.billing.partner.grant, "post">,
    ) => handleElysia(await rpc.api.billing.partner.grant.post(args.body)),
    onSuccess: (_, args, qc) => {
      qc.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old ? { ...old, quota: (old.quota ?? 0) - args.body.quota } : old,
      );
    },
  });
}
