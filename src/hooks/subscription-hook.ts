"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { getRpc } from "@/lib/rpc-lazy";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useSubscriptionPlansQuery() {
  return useQuery({
    queryKey: queryKeys.subscriptionPlans(),
    queryFn: async () => {
      const rpc = await getRpc();
      return handleElysia(await rpc.api.pricing.subscriptions.get());
    },
    enabled: false,
  });
}
