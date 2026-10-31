"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

export function usePriceHistoryQuery(modelName: string) {
  return useElysiaQuery(queryKeys.priceHistory(modelName), () =>
    rpc.api.models["price-history"].get({ query: { model: modelName } }),
  );
}

export function usePriceDropsQuery() {
  return useElysiaQuery(queryKeys.priceDrops(), () =>
    rpc.api.models["price-history"].drops.get(),
  );
}
