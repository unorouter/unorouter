"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export function useSubscriptionPlansQuery() {
  return useQuery({
    queryKey: queryKeys.newApi.subscriptionPlans(),
    queryFn: async () => handleElysia(await rpc.api.subscription.plans.get()),
    enabled: false,
  });
}
