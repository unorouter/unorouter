"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export function usePricingQuery() {
  return useQuery({
    queryKey: queryKeys.newApi.pricing(),
    queryFn: async () => handleElysia(await rpc.api.pricing.get()),
    staleTime: 5 * 60 * 1000,
  });
}
