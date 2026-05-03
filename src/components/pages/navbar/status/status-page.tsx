"use client";

import { PageHeader } from "@/components/elements/content/page-header";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { StatusBanner } from "@/components/blocks/status-banner";
import { StatusBar } from "@/components/blocks/status-bar";
import type { StatusBarData } from "@/components/blocks/status.types";
import {
  StatusComponent,
  StatusComponentBody,
  StatusComponentDescription,
  StatusComponentHeader,
  StatusComponentHeaderLeft,
  StatusComponentHeaderRight,
  StatusComponentIcon,
  StatusComponentStatus,
  StatusComponentTitle,
  StatusComponentUptime,
} from "@/components/blocks/status-component";
import type { StatusType } from "@/components/blocks/status.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePricingQuery } from "@/hooks/pricing-hook";
import {
  type StatusBucket,
  useStatusPage,
} from "@/hooks/use-model-status-hook";
import { VendorFilter } from "@/components/pages/navbar/models/filters/vendor-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectedVendorsAtom } from "@/store/models-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuActivity, LuSearch, LuX } from "react-icons/lu";
import { SummaryCards } from "./summary-cards";

type StatusFilter = "all" | "success" | "degraded" | "error" | "empty";

const VARIANT_FALLBACK: Exclude<StatusType, "empty"> = "success";
const UNGROUPED_VENDOR = "Other";

function asVariant(status: string): Exclude<StatusType, "empty"> {
  switch (status) {
    case "success":
    case "degraded":
    case "error":
      return status;
    default:
      // OpenStatus's variant prop disallows "empty"; surface as success-ish.
      return VARIANT_FALLBACK;
  }
}

// Banner thresholds: a single broken model shouldn't paint the whole platform
// red. Show "error" only when at least 10% of probed models are down, and
// "degraded" when at least 10% are degraded (or any errors exist below the
// error threshold). Below both thresholds, the banner stays "success".
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

const BUCKET_OPTIONS: { value: StatusBucket; hours: number }[] = [
  { value: "1m", hours: 24 },
  { value: "5m", hours: 24 },
  { value: "15m", hours: 24 },
  { value: "1h", hours: 24 },
  { value: "1d", hours: 720 },
];

export function StatusPage() {
  const t = useTranslations();
  const [bucket, setBucket] = useState<StatusBucket>("1m");
  const hours = BUCKET_OPTIONS.find((o) => o.value === bucket)?.hours ?? 24;
  const q = useStatusPage(bucket, hours);
  const data = q.data;
  const pricing = usePricingQuery();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedVendors, setSelectedVendors] = useAtom(selectedVendorsAtom);
  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    selectedVendors.length > 0;
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSelectedVendors([]);
  };

  const components = data?.components ?? [];
  const bars = data?.bars ?? {};
  const pricingModels = pricing.data?.models ?? [];

  const vendorByModel = new Map<string, string>();
  for (const m of pricingModels) {
    vendorByModel.set(m.name, m.vendor.name);
  }

  const filtered = components.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (selectedVendors.length > 0) {
      const vendor = vendorByModel.get(c.name) ?? UNGROUPED_VENDOR;
      if (!selectedVendors.includes(vendor)) return false;
    }
    return true;
  });

  const groupsMap = new Map<string, typeof filtered>();
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

  const overallStatus = deriveOverallStatus(components);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <PageHeader
        badge={t("STATUS.BADGE")}
        badgeIcon={LuActivity}
        title={t("STATUS.TITLE")}
        subtitle={t("STATUS.SUBTITLE")}
        color="#22d3ee"
        centered
        className="mb-12"
      />

      <div className="space-y-6">
        <StatusBanner status={overallStatus} />
        <SummaryCards />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <LuSearch className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder={t("STATUS.FILTER.SEARCH_PLACEHOLDER")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <VendorFilter models={pricingModels} />
          <Select
            value={bucket}
            onValueChange={(v) => setBucket(v as StatusBucket)}
          >
            <SelectTrigger className="w-27.5 font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUCKET_OPTIONS.map((o) => (
                <SelectItem
                  key={o.value}
                  value={o.value}
                  className="font-mono text-xs"
                >
                  {o.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-1">
            <FilterPill
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
              label={t("STATUS.FILTER.STATUS_ALL")}
            />
            <FilterPill
              active={statusFilter === "success"}
              onClick={() => setStatusFilter("success")}
              label={t("STATUS.STATE.OPERATIONAL")}
            />
            <FilterPill
              active={statusFilter === "degraded"}
              onClick={() => setStatusFilter("degraded")}
              label={t("STATUS.STATE.DEGRADED")}
            />
            <FilterPill
              active={statusFilter === "error"}
              onClick={() => setStatusFilter("error")}
              label={t("STATUS.STATE.DOWN")}
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="font-mono text-xs"
            >
              {t("MODELS.FILTER.RESET")}
              <LuX className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-24 text-center font-mono text-sm">
            {t("STATUS.FILTER.EMPTY")}
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {groups.map((group) => (
              <section key={group.vendor} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <VendorIcon vendor={group.vendor} size={16} />
                  <h2 className="font-mono text-sm font-semibold tracking-wide">
                    {group.vendor}
                  </h2>
                  <span className="text-muted-foreground font-mono text-xs">
                    {group.items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {group.items.map((c) => (
                    <StatusComponent key={c.id} variant={asVariant(c.status)}>
                      <StatusComponentHeader>
                        <StatusComponentHeaderLeft>
                          <StatusComponentIcon />
                          <StatusComponentTitle>{c.name}</StatusComponentTitle>
                          {c.description && (
                            <StatusComponentDescription>
                              {c.description}
                            </StatusComponentDescription>
                          )}
                        </StatusComponentHeaderLeft>
                        <StatusComponentHeaderRight>
                          <StatusComponentUptime>
                            {c.uptime_24h.toFixed(2)}%
                          </StatusComponentUptime>
                          <StatusComponentStatus />
                        </StatusComponentHeaderRight>
                      </StatusComponentHeader>
                      <StatusComponentBody>
                        <StatusBar
                          data={
                            (bars[c.name] ?? []) as unknown as StatusBarData[]
                          }
                        />
                      </StatusComponentBody>
                    </StatusComponent>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill(props: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      variant={props.active ? "default" : "outline"}
      size="sm"
      onClick={props.onClick}
      className="font-mono text-xs"
    >
      {props.label}
    </Button>
  );
}
