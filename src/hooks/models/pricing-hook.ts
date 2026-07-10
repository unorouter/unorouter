"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";

export function usePricingQuery() {
  // enabled + staleTime Infinity: fetches only when no page dehydrated the
  // pricing cache (home ticker, chat model selector); hydrated pages never
  // refetch. `enabled: false` left those consumers permanently empty once
  // home/chat stopped dehydrating pricing.
  return useElysiaQuery(queryKeys.pricing(), () =>
    rpc.api.models.pricing.get(),
  );
}
