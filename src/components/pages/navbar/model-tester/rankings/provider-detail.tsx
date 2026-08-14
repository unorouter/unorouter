"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import { useProviderDetail } from "@/hooks/models/model-tester-rankings-hook";
import { Link } from "@/i18n/navigation";
import { vendorForRow } from "@/lib/ai/verify/models";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { RankBar } from "../shared/rank-bar";

export function ProviderDetail(props: { host: string }) {
  const t = useTranslations();
  const detailQuery = useProviderDetail(props.host);
  const detail = detailQuery.data;
  const provider = detail?.provider;
  const models = detail?.models ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/ai-api-model-tester/rankings"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm transition-colors"
      >
        <Icon name="arrow-left" className="size-4" />
        {t("MODEL_TESTER.DETAIL.BACK")}
      </Link>

      {!provider ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("MODEL_TESTER.DETAIL.NOT_FOUND")}
        </p>
      ) : (
        <>
          <section className="bg-card overflow-hidden rounded-lg border">
            <header className="flex items-center gap-2.5 px-5 py-4">
              <VendorIcon
                vendor={vendorForRow(provider.provider)}
                size={24}
                className="shrink-0"
              />
              <span className="text-base font-semibold">{props.host}</span>
            </header>
            <div className="grid grid-cols-2 divide-x divide-y border-t sm:grid-cols-4 sm:divide-y-0">
              <Stat
                label={t("MODEL_TESTER.RANKINGS.STAT_DETECTIONS")}
                value={provider.sampleCount.toLocaleString()}
              />
              <Stat
                label={t("MODEL_TESTER.RANKINGS.STAT_MODELS")}
                value={provider.modelCount.toLocaleString()}
              />
              <Stat
                label={t("MODEL_TESTER.RANKINGS.STAT_PASS_RATE")}
                value={`${Math.round(provider.avgPassRate * 100)}%`}
              />
              <Stat
                label={t("MODEL_TESTER.RANKINGS.STAT_P95")}
                value={
                  provider.p95LatencyMs !== null
                    ? `${Math.round(provider.p95LatencyMs)}ms`
                    : "-"
                }
              />
            </div>
          </section>

          <section className="bg-card overflow-hidden rounded-lg border">
            <header className="border-b px-5 py-4">
              <span className="text-base font-semibold">
                {t("MODEL_TESTER.RANKINGS.PROVIDER_MODELS_TITLE")}
              </span>
            </header>
            <div className="divide-border divide-y">
              {models.map((model) => {
                const passPct = Math.round(model.avgPassRate * 100);
                const lowN = model.sampleCount < 5;
                return (
                  <Link
                    key={model.model}
                    href={{
                      pathname: "/ai-api-model-tester/rankings/[host]/[model]",
                      params: {
                        host: encodeURIComponent(props.host),
                        model: encodeURIComponent(model.model),
                      },
                    }}
                    className="hover:bg-muted/30 flex items-center gap-3 px-4 py-3 transition-colors sm:gap-4 sm:px-5"
                  >
                    <VendorIcon
                      vendor={vendorForRow(model.provider, model.model)}
                      size={22}
                      className="shrink-0"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-medium">
                          {model.model}
                        </span>
                        <span className="text-foreground/70 shrink-0 text-xs">
                          {t("MODEL_TESTER.RANKINGS.LAST_TESTED", {
                            when: dayjs(model.lastTestedAt).fromNow(),
                          })}
                        </span>
                      </div>
                      <RankBar pct={passPct} lowN={lowN} />
                      <span className="text-muted-foreground truncate text-xs">
                        <span className="font-mono tabular-nums">
                          {Math.round(model.avgLatencyMs)}ms
                        </span>
                        {" · "}
                        {t("MODEL_TESTER.RANKINGS.SAMPLES", {
                          count: model.sampleCount,
                        })}
                        {lowN
                          ? ` · ${t("MODEL_TESTER.RANKINGS.LOW_CONFIDENCE", {
                              count: model.sampleCount,
                            })}`
                          : ""}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat(props: { label: string; value: string }) {
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
