"use client";

import { useStatusComponents } from "@/hooks/models/model-status-hook";

export type ModelStatusInfo = {
  status: string;
  uptime24h: number;
  upChannels: number;
  totalChannels: number;
};

// One lightweight /components fetch (no bar series), mapped by model name so the
// chat model drawer can show a per-row reliability dot without a per-row query.
export function useModelStatusMap(): Map<string, ModelStatusInfo> {
  const query = useStatusComponents();
  const map = new Map<string, ModelStatusInfo>();
  const rows = query.data ?? [];
  for (const c of rows) {
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
