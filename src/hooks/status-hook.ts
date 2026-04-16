"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { getRpc } from "@/lib/rpc-lazy";
import { useQuery } from "@tanstack/react-query";

export function useStatusQuery() {
  return useQuery({
    queryKey: queryKeys.status(),
    queryFn: async () => {
      const { rpc, handleElysia } = await getRpc();
      return handleElysia(await rpc.api.auth.status.get());
    },
  });
}
