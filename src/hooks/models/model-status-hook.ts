"use client";

import { useElysiaQuery } from "@/hooks/use-elysia-query";

import {
  type CompactPagePayload,
  decodeCompactPage,
} from "@/lib/api/model-status-compact";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { StatusBucket } from "@/lib/types";
import { handleElysia } from "@/lib/utils/base";
import { useQuery } from "@tanstack/react-query";

export function useStatusPage(bucket: StatusBucket = "1m", hours: number = 24) {
  return useQuery({
    queryKey: queryKeys.modelStatusPage(bucket, hours),
    queryFn: async () => {
      const raw = handleElysia(
        await rpc.api.models["model-status"].page_compact.get({
          query: { bucket, hours },
        }),
      ) as unknown as CompactPagePayload;
      return decodeCompactPage(raw);
    },
  });
}

export function useStatusComponents() {
  return useElysiaQuery(queryKeys.modelStatusComponents(), () =>
    rpc.api.models["model-status"].components.get(),
  );
}
