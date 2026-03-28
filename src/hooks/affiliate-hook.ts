"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { PaginationParams } from "@/lib/types";
import { handleElysia } from "@/lib/utils/base";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quota: number) =>
      handleElysia(await rpc.api.affiliate.transfer.post({ quota })),
    onSuccess: (_, transferredQuota) => {
      queryClient.setQueryData(queryKeys.auth(), (old: any) =>
        old
          ? {
              ...old,
              data: {
                ...old.data,
                quota: (old.data?.quota ?? 0) - transferredQuota,
              },
            }
          : old,
      );
    },
  });
}
