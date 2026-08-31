"use client";

import { useHistoryProviders } from "@/hooks/ai/model-tester/tester-hooks";
import { Link } from "@/i18n/navigation";
import { vendorForRow } from "@unorouter/verify-core/models";
import { useTranslations } from "next-intl";
import { ProviderRowBody } from "../shared/provider-row";
import { totalSamples, weightedPassRate } from "../shared/stats";

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

  const totalTests = totalSamples(rows);
  const totalModels = rows.reduce((s, r) => s + r.modelCount, 0);
  const avgPassRate = weightedPassRate(rows);

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
        {rows.map((row) => (
          <Link
            key={row.baseUrlHost}
            href={{
              pathname: "/ai-api-model-tester/history/provider/[host]",
              params: { host: encodeURIComponent(row.baseUrlHost) },
            }}
            className="hover:bg-muted/30 flex items-center gap-3 px-4 py-3 transition-colors sm:gap-4 sm:px-5"
          >
            <ProviderRowBody
              vendor={vendorForRow(row.provider)}
              name={row.baseUrlHost}
              lastTestedAt={row.lastTestedAt}
              passRate={row.avgPassRate}
              latencyMs={row.avgLatencyMs}
              meta={`${t("MODEL_TESTER.RANKINGS.MODELS_TRACKED", {
                count: row.modelCount,
              })} · ${t("MODEL_TESTER.RANKINGS.SAMPLES", {
                count: row.sampleCount,
              })}`}
            />
          </Link>
        ))}
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
