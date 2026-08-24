"use client";

import { useElysiaQuery } from "@/lib/react-query/hooks";

import {
  decodeBucketDtos,
  decodeCompactPage,
} from "@/lib/api/model-status-decode";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import type { StatusBucket } from "@/lib/types";

// Every `select` here must stay a module-level reference: an inline arrow re-decodes
// all ~36k buckets on every render.
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

export type ModelStatusInfo = {
  status: string;
  uptime24h: number;
  upChannels: number;
  totalChannels: number;
};

type StatusComponentRow = {
  name?: string;
  status: string;
  uptime_24h: number;
  up_channels: number;
  total_channels: number;
};

const EMPTY_STATUS_MAP: ReadonlyMap<string, ModelStatusInfo> = new Map();

function toStatusMap(
  rows: readonly StatusComponentRow[] | null | undefined,
): ReadonlyMap<string, ModelStatusInfo> {
  const map = new Map<string, ModelStatusInfo>();
  for (const c of rows ?? []) {
    if (!c.name) continue;
    map.set(c.name, {
      status: c.status,
      uptime24h: c.uptime_24h,
      upChannels: c.up_channels,
      totalChannels: c.total_channels,
    });
  }
  return map;
}

export function useModelStatusMap(): ReadonlyMap<string, ModelStatusInfo> {
  const query = useElysiaQuery(
    queryKeys.modelStatusComponents(),
    () => rpc.api.models["model-status"].components.get(),
    { select: toStatusMap },
  );
  return query.data ?? EMPTY_STATUS_MAP;
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
