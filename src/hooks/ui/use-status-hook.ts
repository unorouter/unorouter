"use client";

import type { StatusType } from "@/components/ui/status/status.types";
import { useStatusPage as useStatusPageQuery } from "@/hooks/models/model-status-hook";
import type { StatusBucket } from "@/lib/types";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import {
  collapsedVendorsAtom,
  selectedVendorsAtom,
  toggleVendorCollapsedAtom,
} from "@/store/models-store";
import {
  type StatusFilter,
  statusBucketAtom,
  statusFilterAtom,
} from "@/store/status-store";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useDeferredValue, useState } from "react";

const UNGROUPED_VENDOR = "Other";

// Bucket+window keeps bar count 30-200 (1m*24h=1440 = sub-pixel garbage).
export const BUCKET_OPTIONS: { value: StatusBucket; hours: number }[] = [
  { value: "1m", hours: 1 },
  { value: "5m", hours: 6 },
  { value: "15m", hours: 24 },
  { value: "1h", hours: 168 },
  { value: "1d", hours: 720 },
];

// Banner: error >=10% down, degraded >=10% degraded (or any errors below the error threshold).
const ERROR_RATIO = 0.1;
const DEGRADED_RATIO = 0.1;

function deriveOverallStatus(
  components: { status: string }[],
): Exclude<StatusType, "empty"> {
  const probed = components.filter((c) => c.status !== "empty");
  if (probed.length === 0) return "success";

  const errors = probed.filter((c) => c.status === "error").length;
  const degraded = probed.filter((c) => c.status === "degraded").length;

  if (errors / probed.length >= ERROR_RATIO) return "error";
  if (errors > 0 || degraded / probed.length >= DEGRADED_RATIO)
    return "degraded";
  return "success";
}

type StatusComponent = NonNullable<
  NonNullable<ReturnType<typeof useStatusPageQuery>["data"]>["components"]
>[number];

type StatusListItem =
  | {
      kind: "header";
      vendor: string;
      count: number;
      operational: number;
      degraded: number;
      down: number;
    }
  | { kind: "row"; component: StatusComponent };

export function useStatusFilter() {
  const [bucket, setBucket] = useAtom(statusBucketAtom);
  const hours = BUCKET_OPTIONS.find((o) => o.value === bucket)?.hours ?? 24;
  const q = useStatusPageQuery(bucket, hours);
  const data = q.data;
  const pricing = usePricingQuery();

  const [search, setSearch] = useState("");
  // Defer search: input stays responsive while filtering 78 rows.
  const deferredSearch = useDeferredValue(search);

  const [statusFilter, setStatusFilter] = useAtom(statusFilterAtom);
  const [selectedVendors, setSelectedVendors] = useAtom(selectedVendorsAtom);
  const collapsedVendors = useAtomValue(collapsedVendorsAtom);
  const setCollapsedVendors = useSetAtom(collapsedVendorsAtom);
  const toggleVendorCollapsed = useSetAtom(toggleVendorCollapsedAtom);
  const collapsedSet = new Set(collapsedVendors);

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    selectedVendors.length > 0 ||
    collapsedVendors.length > 0 ||
    bucket !== "1m";

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSelectedVendors([]);
    setCollapsedVendors([]);
    setBucket("1m");
  };

  const components: StatusComponent[] = data?.components ?? [];
  const bars = data?.bars ?? {};
  const pricingModels = pricing.data?.models ?? [];

  const vendorByModel = new Map<string, string>();
  for (const m of pricingModels) {
    vendorByModel.set(m.name, m.vendor.name);
  }

  const searchLower = deferredSearch.toLowerCase();
  const filtered = components.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    const vendor = vendorByModel.get(c.name) ?? UNGROUPED_VENDOR;
    if (
      searchLower &&
      !c.name.toLowerCase().includes(searchLower) &&
      !vendor.toLowerCase().includes(searchLower)
    )
      return false;
    if (selectedVendors.length > 0 && !selectedVendors.includes(vendor))
      return false;
    return true;
  });

  const groupsMap = new Map<string, StatusComponent[]>();
  for (const c of filtered) {
    const vendor = vendorByModel.get(c.name) ?? UNGROUPED_VENDOR;
    const group = groupsMap.get(vendor);
    if (group) {
      group.push(c);
    } else {
      groupsMap.set(vendor, [c]);
    }
  }
  const groups = [...groupsMap.entries()]
    .map(([vendor, items]) => ({ vendor, items }))
    .sort((a, b) => {
      if (a.vendor === UNGROUPED_VENDOR) return 1;
      if (b.vendor === UNGROUPED_VENDOR) return -1;
      return b.items.length - a.items.length;
    });

  const visibleVendors = groups.map((g) => g.vendor);
  const allCollapsed =
    visibleVendors.length > 0 &&
    visibleVendors.every((v) => collapsedSet.has(v));
  const toggleAllGroups = () => {
    if (allCollapsed) {
      setCollapsedVendors(
        collapsedVendors.filter((v) => !visibleVendors.includes(v)),
      );
    } else {
      const merged = new Set(collapsedVendors);
      for (const v of visibleVendors) merged.add(v);
      setCollapsedVendors([...merged]);
    }
  };

  // Flatten groups for virtua; all 78 rows otherwise = 40k+ DOM nodes.
  const items: StatusListItem[] = [];
  for (const group of groups) {
    let operational = 0;
    let degraded = 0;
    let down = 0;
    for (const c of group.items) {
      if (c.status === "success") operational++;
      else if (c.status === "degraded") degraded++;
      else if (c.status === "error") down++;
    }
    items.push({
      kind: "header",
      vendor: group.vendor,
      count: group.items.length,
      operational,
      degraded,
      down,
    });
    if (collapsedSet.has(group.vendor)) continue;
    for (const c of group.items) {
      items.push({ kind: "row", component: c });
    }
  }

  const overallStatus = deriveOverallStatus(components);

  return {
    bucket,
    setBucket,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    selectedVendors,
    collapsedSet,
    toggleVendorCollapsed,
    hasActiveFilters,
    resetFilters,
    bars,
    filtered,
    visibleVendors,
    allCollapsed,
    toggleAllGroups,
    items,
    overallStatus,
  };
}

export type { StatusFilter };
