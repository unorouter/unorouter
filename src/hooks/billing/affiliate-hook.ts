"use client";

import { useApiMutation, useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs, EdenQuery } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import type { UserSelfData } from "@/openapi";

export function useAffiliateCommissionsQuery(
  query?: EdenQuery<typeof rpc.api.billing.affiliate.commissions>,
) {
  return useElysiaQuery(queryKeys.affiliateCommissions(query), () =>
    rpc.api.billing.affiliate.commissions.get({ query }),
  );
}

export function useAffiliateInviteesQuery(
  query?: EdenQuery<typeof rpc.api.billing.affiliate.invitees>,
) {
  return useElysiaQuery(queryKeys.affiliateInvitees(query), () =>
    rpc.api.billing.affiliate.invitees.get({ query }),
  );
}

export function useTransferAffQuotaMutation() {
  return useApiMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.billing.affiliate.transfer, "post">,
    ) => handleElysia(await rpc.api.billing.affiliate.transfer.post(args.body)),
    onSuccess: (_, args, qc) => {
      qc.setQueryData<UserSelfData>(queryKeys.auth(), (old) =>
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
