"use client";

import { useElysiaQuery } from "@/hooks/use-elysia-query";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

export function useSubscriptionPlansQuery() {
  return useElysiaQuery(
    queryKeys.subscriptionPlans(),
    () => rpc.api.models.pricing.subscriptions.get(),
    { enabled: false },
  );
}
