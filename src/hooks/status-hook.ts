"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { getRpc } from "@/lib/rpc-lazy";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useStatusQuery() {
  return useQuery({
    queryKey: queryKeys.status(),
    queryFn: async () => {
      const rpc = await getRpc();
      return handleElysia(await rpc.api.auth.status.get());
    },
  });
}
