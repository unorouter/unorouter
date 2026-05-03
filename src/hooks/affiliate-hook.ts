"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import type { EdenArgs } from "@/lib/types/eden";
import { handleError } from "@/lib/utils/client";
import type { UserSelfData } from "@/openapi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

export function useAffiliateCommissionsQuery(
  args: EdenArgs<typeof rpc.api.affiliate.commissions, "get"> = {},
) {
  return useQuery({
    queryKey: queryKeys.affiliateCommissions(args.query),
    queryFn: async () => {
      return handleElysia(
        await rpc.api.affiliate.commissions.get({ query: args.query }),
      );
    },
  });
}

export function useAffiliateInviteesQuery(
  args: EdenArgs<typeof rpc.api.affiliate.invitees, "get"> = {},
) {
  return useQuery({
    queryKey: queryKeys.affiliateInvitees(args.query),
    queryFn: async () => {
      return handleElysia(
        await rpc.api.affiliate.invitees.get({ query: args.query }),
      );
    },
  });
}

export function useTransferAffQuotaMutation() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.affiliate.transfer, "post">,
    ) => {
      return handleElysia(await rpc.api.affiliate.transfer.post(args.body));
    },
    onError: (e) => handleError(e, t),
    onSuccess: (_, args) => {
      queryClient.setQueryData<UserSelfData>(
        queryKeys.auth(),
        (old) =>
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
