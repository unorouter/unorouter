"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { PaginationParams } from "@/lib/types";
import { handleElysia } from "@/lib/utils/base";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAffiliateCommissionsQuery(params: PaginationParams = {}) {
  return useQuery({
    queryKey: queryKeys.affiliateCommissions(params),
    queryFn: async () =>
      handleElysia(
        await rpc.api.affiliate.commissions.get({
          query: {
            p: params.p?.toString(),
            page_size: params.page_size?.toString(),
          },
        }),
      ),
  });
}

export function useAffiliateInviteesQuery(params: PaginationParams = {}) {
  return useQuery({
    queryKey: queryKeys.affiliateInvitees(params),
    queryFn: async () =>
      handleElysia(
        await rpc.api.affiliate.invitees.get({
          query: {
            p: params.p?.toString(),
            page_size: params.page_size?.toString(),
          },
        }),
      ),
  });
}

export function useTransferAffQuotaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quota: number) =>
      handleElysia(await rpc.api.affiliate.transfer.post({ quota })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth() });
    },
  });
}
