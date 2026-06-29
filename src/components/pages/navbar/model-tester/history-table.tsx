"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { useHistoryProviders } from "@/hooks/ai/model-tester/tester-hooks";
import { Link } from "@/i18n/navigation";
import { vendorForRow } from "@/lib/ai/verify/models";
import { useTranslations } from "next-intl";
import { RankBar } from "./rank-bar";
import type { VerifyProvider } from "@/lib/ai/verify/types";

// Level 1 of the local history: the user's providers (grouped by host), mirroring
// the public rankings layout.
export function HistoryTable() {
  const t = useTranslations();
  const providersQuery = useHistoryProviders();
  const rows = providersQuery.data ?? [];

  if (rows.length === 0)
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t("MODEL_TESTER.HISTORY.EMPTY")}
      </p>
    );

  // Stats derived from the loaded providers (local history, no extra query).
  const totalTests = rows.reduce((s, r) => s + r.sampleCount, 0);
  const totalModels = rows.reduce((s, r) => s + r.modelCount, 0);
  const avgPassRate =
    totalTests > 0
      ? rows.reduce((s, r) => s + r.avgPassRate * r.sampleCount, 0) / totalTests
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <HistoryStat
          label={t("MODEL_TESTER.RANKINGS.STAT_DETECTIONS")}
          value={totalTests.toLocaleString()}
        />
        <HistoryStat
          label={t("MODEL_TESTER.RANKINGS.STAT_PROVIDERS")}
          value={rows.length.toLocaleString()}
        />
        <HistoryStat
          label={t("MODEL_TESTER.RANKINGS.STAT_MODELS")}
          value={totalModels.toLocaleString()}
        />
        <HistoryStat
          label={t("MODEL_TESTER.RANKINGS.STAT_PASS_RATE")}
          value={`${Math.round(avgPassRate * 100)}%`}
        />
      </div>

      <div className="bg-card flex flex-col divide-y overflow-hidden rounded-lg border">
        {rows.map((row) => {
          const passPct = Math.round(row.avgPassRate * 100);
          return (
            <Link
              key={row.baseUrlHost}
              href={{
                pathname: "/ai-api-model-tester/history/provider/[host]",
                params: { host: encodeURIComponent(row.baseUrlHost) },
              }}
              className="hover:bg-muted/30 flex items-center gap-3 px-4 py-3 transition-colors sm:gap-4 sm:px-5"
            >
              <VendorIcon
                vendor={vendorForRow(row.provider as VerifyProvider)}
                size={22}
                className="shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium">
                    {row.baseUrlHost}
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                    {Math.round(row.avgLatencyMs)}ms
                  </span>
                </div>
                <RankBar pct={passPct} />
                <span className="text-muted-foreground truncate text-xs">
                  {t("MODEL_TESTER.RANKINGS.MODELS_TRACKED", {
                    count: row.modelCount,
                  })}{" "}
                  ·{" "}
                  {t("MODEL_TESTER.RANKINGS.SAMPLES", {
                    count: row.sampleCount,
                  })}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function HistoryStat(props: { label: string; value: string }) {
  return (
    <div className="bg-card flex flex-col items-center gap-1 overflow-hidden rounded-lg border px-5 py-4 text-center">
      <span className="font-mono text-2xl font-semibold tabular-nums">
        {props.value}
      </span>
      <span className="text-muted-foreground/80 text-[10px] font-medium tracking-widest uppercase">
        {props.label}
      </span>
    </div>
  );
}
