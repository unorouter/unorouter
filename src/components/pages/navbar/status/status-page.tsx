"use client";

import { PageHeader } from "@/components/elements/content/page-header";
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
import {
  type StatusBucket,
  useStatusPage,
} from "@/hooks/use-model-status-hook";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuActivity, LuSearch } from "react-icons/lu";
import { SummaryCards } from "./summary-cards";

type StatusFilter = "all" | "success" | "degraded" | "error" | "empty";

const VARIANT_FALLBACK: Exclude<StatusType, "empty"> = "success";

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

function deriveOverallStatus(
  components: { status: string }[],
): Exclude<StatusType, "empty"> {
  if (components.some((c) => c.status === "error")) return "error";
  if (components.some((c) => c.status === "degraded")) return "degraded";
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
  const hours =
    BUCKET_OPTIONS.find((o) => o.value === bucket)?.hours ?? 24;
  const q = useStatusPage(bucket, hours);
  const data = q.data;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const components = data?.components ?? [];
  const bars = data?.bars ?? {};

  const filtered = components.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
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
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-24 text-center font-mono text-sm">
            {t("STATUS.FILTER.EMPTY")}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((c) => (
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
                    data={(bars[c.name] ?? []) as unknown as StatusBarData[]}
                  />
                </StatusComponentBody>
              </StatusComponent>
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
