"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { StatusBucket } from "@/lib/types/status";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useStatusPage(bucket: StatusBucket = "1m", hours: number = 24) {
  return useQuery({
    queryKey: queryKeys.modelStatusPage(bucket, hours),
    queryFn: async () =>
      handleElysia(
        await rpc.api["model-status"].page.get({
          query: { bucket, hours },
        }),
      ),
  });
}

export function useStatusComponents() {
  return useQuery({
    queryKey: queryKeys.modelStatusComponents(),
    queryFn: async () =>
      handleElysia(await rpc.api["model-status"].components.get()),
  });
}
