"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import { useHistoryModels } from "@/hooks/ai/model-tester/tester-hooks";
import { Link } from "@/i18n/navigation";
import { vendorForRow } from "@/lib/ai/verify/models";
import { useTranslations } from "next-intl";
import { RankBar } from "./rank-bar";

export function HistoryProviderDetail(props: { host: string }) {
  const t = useTranslations();
  const modelsQuery = useHistoryModels(props.host);
  const data = modelsQuery.data;
  const models = data?.models ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/ai-api-model-tester/history"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm transition-colors"
      >
        <Icon name="arrow-left" className="size-4" />
        {t("MODEL_TESTER.DETAIL.BACK")}
      </Link>

      {models.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("MODEL_TESTER.DETAIL.NOT_FOUND")}
        </p>
      ) : (
        <section className="bg-card overflow-hidden rounded-lg border">
          <header className="flex items-center gap-2.5 border-b px-5 py-4">
            <VendorIcon
              vendor={vendorForRow(data?.provider ?? models[0]!.provider)}
              size={22}
              className="shrink-0"
            />
            <div className="flex min-w-0 flex-col">
              <span className="text-base font-semibold">{props.host}</span>
              <span className="text-muted-foreground text-xs">
                {t("MODEL_TESTER.RANKINGS.PROVIDER_MODELS_TITLE")}
              </span>
            </div>
          </header>
          <div className="grid grid-cols-3 divide-x border-t">
            <HistoryStat
              label={t("MODEL_TESTER.RANKINGS.STAT_DETECTIONS")}
              value={models
                .reduce((s, m) => s + m.sampleCount, 0)
                .toLocaleString()}
            />
            <HistoryStat
              label={t("MODEL_TESTER.RANKINGS.STAT_MODELS")}
              value={models.length.toLocaleString()}
            />
            <HistoryStat
              label={t("MODEL_TESTER.RANKINGS.STAT_PASS_RATE")}
              value={`${Math.round(
                (() => {
                  const total = models.reduce((s, m) => s + m.sampleCount, 0);
                  return total > 0
                    ? (models.reduce(
                        (s, m) => s + m.avgPassRate * m.sampleCount,
                        0,
                      ) /
                        total) *
                        100
                    : 0;
                })(),
              )}%`}
            />
          </div>
          <div className="divide-border divide-y border-t">
            {models.map((model) => {
              const passPct = Math.round(model.avgPassRate * 100);
              return (
                <Link
                  key={model.requestedModel}
                  href={{
                    pathname:
                      "/ai-api-model-tester/history/provider/[host]/[model]",
                    params: {
                      host: encodeURIComponent(props.host),
                      model: encodeURIComponent(model.requestedModel),
                    },
                  }}
                  className="hover:bg-muted/30 flex items-center gap-3 px-4 py-3 transition-colors sm:gap-4 sm:px-5"
                >
                  <VendorIcon
                    vendor={vendorForRow(model.provider, model.requestedModel)}
                    size={22}
                    className="shrink-0"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium">
                        {model.requestedModel}
                      </span>
                      <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                        {Math.round(model.avgLatencyMs)}ms
                      </span>
                    </div>
                    <RankBar pct={passPct} />
                    <span className="text-muted-foreground truncate text-xs">
                      {t("MODEL_TESTER.RANKINGS.SAMPLES", {
                        count: model.sampleCount,
                      })}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function HistoryStat(props: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-5 py-4 text-center">
      <span className="font-mono text-xl font-semibold tabular-nums">
        {props.value}
      </span>
      <span className="text-muted-foreground/80 text-[10px] font-medium tracking-widest uppercase">
        {props.label}
      </span>
    </div>
  );
}
