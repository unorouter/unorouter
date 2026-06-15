"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

export function usePricingQuery() {
  return useElysiaQuery(
    queryKeys.pricing(),
    () => rpc.api.models.pricing.get(),
    { enabled: false },
  );
}
