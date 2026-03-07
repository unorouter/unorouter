"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAffiliateCommissionsQuery() {
  return useQuery({
    queryKey: queryKeys.affiliateCommissions(),
    queryFn: async () =>
      handleElysia(await rpc.api.affiliate.commissions.get()),
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
