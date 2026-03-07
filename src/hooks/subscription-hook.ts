"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useSubscriptionPlansQuery() {
  return useQuery({
    queryKey: queryKeys.subscriptionPlans(),
    queryFn: async () =>
      handleElysia(await rpc.api.pricing.subscriptions.get()),
    enabled: false,
  });
}
