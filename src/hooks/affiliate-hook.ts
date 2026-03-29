"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { EdenArgs } from "@/lib/types/eden";
import { handleElysia } from "@/lib/utils/base";
import type { ResponseDtoUserSelfDataData } from "@/openapi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAffiliateCommissionsQuery(
  args: EdenArgs<typeof rpc.api.affiliate.commissions, "get"> = {},
) {
  return useQuery({
    queryKey: queryKeys.affiliateCommissions(args.query),
    queryFn: async () =>
      handleElysia(
        await rpc.api.affiliate.commissions.get({ query: args.query }),
      ),
  });
}

export function useAffiliateInviteesQuery(
  args: EdenArgs<typeof rpc.api.affiliate.invitees, "get"> = {},
) {
  return useQuery({
    queryKey: queryKeys.affiliateInvitees(args.query),
    queryFn: async () =>
      handleElysia(
        await rpc.api.affiliate.invitees.get({ query: args.query }),
      ),
  });
}

export function useTransferAffQuotaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      args: EdenArgs<typeof rpc.api.affiliate.transfer, "post">,
    ) =>
      handleElysia(await rpc.api.affiliate.transfer.post(args.body)),
    onSuccess: (_, args) => {
      queryClient.setQueryData<ResponseDtoUserSelfDataData>(
        queryKeys.auth(),
        (old) =>
          old
            ? {
                ...old,
                quota: (old.quota ?? 0) - (args.body?.quota ?? 0),
              }
            : old,
      );
    },
  });
}
