"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import {
  decodeBucketDtos,
  decodeCompactPage,
} from "@/lib/api/model-status-decode";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { StatusBucket } from "@/lib/types";

// select is passed by reference, never as an inline arrow: react-query memoizes
// on (data, select) identity, so a fresh closure per render re-decodes all
// ~36k buckets on every keystroke in the page's search box.
export function useStatusPage(bucket: StatusBucket = "1m", hours: number = 24) {
  return useElysiaQuery(
    queryKeys.modelStatusPage(bucket, hours),
    () =>
      rpc.api.models["model-status"].page_compact.get({
        query: { bucket, hours },
      }),
    { select: decodeCompactPage },
  );
}

export function useStatusComponents() {
  return useElysiaQuery(queryKeys.modelStatusComponents(), () =>
    rpc.api.models["model-status"].components.get(),
  );
}

export function useModelStatusBucketsQuery(
  model: string | null,
  bucket: StatusBucket = "15m",
  hours: number = 24,
) {
  return useElysiaQuery(
    queryKeys.modelStatusBuckets(model ?? "", bucket, hours),
    () =>
      rpc.api.models["model-status"].buckets.get({
        query: { model: model!, bucket, hours },
      }),
    {
      enabled: Boolean(model),
      select: decodeBucketDtos,
    },
  );
}
