"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useStatusQuery() {
  return useQuery({
    queryKey: queryKeys.status(),
    queryFn: async () => handleElysia(await rpc.api.auth.status.get()),
  });
}
