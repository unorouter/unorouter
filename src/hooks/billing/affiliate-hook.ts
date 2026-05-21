"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenQuery } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import { handleError } from "@/lib/utils/client";
import type { UserSelfData } from "@/openapi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export function useAffiliateCommissionsQuery(
  query?: EdenQuery<typeof rpc.api.billing.affiliate.commissions>,
) {
  return useQuery({
    queryKey: queryKeys.affiliateCommissions(query),
    queryFn: async () =>
      handleElysia(await rpc.api.billing.affiliate.commissions.get({ query })),
  });
}

export function useAffiliateInviteesQuery(
  query?: EdenQuery<typeof rpc.api.billing.affiliate.invitees>,
) {
  return useQuery({
    queryKey: queryKeys.affiliateInvitees(query),
    queryFn: async () =>
      handleElysia(await rpc.api.billing.affiliate.invitees.get({ query })),
  });
}

export function useTransferAffQuotaMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.billing.affiliate.transfer, "post">,
    ) => {
      return handleElysia(
        await rpc.api.billing.affiliate.transfer.post(args.body),
      );
    },
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      queryClient.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
        old
          ? {
              ...old,
              quota: (old.quota ?? 0) - args.body.quota,
            }
          : old,
      );
    },
  });
}
