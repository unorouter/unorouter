"use client";

import { useElysiaQuery } from "@/hooks/use-elysia-query";

import {
  type CompactPagePayload,
  decodeCompactPage,
} from "@/lib/api/model-status-compact";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { StatusBucket } from "@/lib/types";

export function useStatusPage(bucket: StatusBucket = "1m", hours: number = 24) {
  return useElysiaQuery(
    queryKeys.modelStatusPage(bucket, hours),
    () =>
      rpc.api.models["model-status"].page_compact.get({
        query: { bucket, hours },
      }),
    {
      select: (raw) => decodeCompactPage(raw as unknown as CompactPagePayload),
    },
  );
}

export function useStatusComponents() {
  return useElysiaQuery(queryKeys.modelStatusComponents(), () =>
    rpc.api.models["model-status"].components.get(),
  );
}
