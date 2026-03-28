"use client";

import { rpc } from "@/lib/rpc";
import { PaginationParams } from "@/lib/types";
import { handleElysia } from "@/lib/utils/base";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthQuery } from "./auth-hook";
import { queryKeys } from "@/lib/react-query/keys";

export function useAffiliateCommissionsQuery(params: PaginationParams = {}) {
  return useQuery({
    queryKey: queryKeys.affiliateCommissions(params),
    queryFn: async () =>
      handleElysia(
        await rpc.api.affiliate.commissions.get({ query: params }),
      ),
  });
}

export function useAffiliateInviteesQuery(params: PaginationParams = {}) {
  return useQuery({
    queryKey: queryKeys.affiliateInvitees(params),
    queryFn: async () =>
      handleElysia(
        await rpc.api.affiliate.invitees.get({ query: params }),
      ),
  });
}

export function useTransferAffQuotaMutation() {
  const authQuery = useAuthQuery();
  return useMutation({
    mutationFn: async (quota: number) =>
      handleElysia(await rpc.api.affiliate.transfer.post({ quota })),
    onSuccess: () => {
      authQuery.refetch();
    },
  });
}
