"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function usePricingQuery() {
  return useQuery({
    queryKey: queryKeys.pricing(),
    queryFn: async () => {
      return handleElysia(await rpc.api.pricing.get());
    },
    enabled: false,
  });
}
