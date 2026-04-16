"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { getRpc } from "@/lib/rpc-lazy";
import { useQuery } from "@tanstack/react-query";

export function usePricingQuery() {
  return useQuery({
    queryKey: queryKeys.pricing(),
    queryFn: async () => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(await rpc.api.pricing.get());
    },
    enabled: false,
  });
}
