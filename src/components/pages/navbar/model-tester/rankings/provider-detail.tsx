"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import { useProviderDetail } from "@/hooks/models/model-tester-rankings-hook";
import { Link } from "@/i18n/navigation";
import { vendorForRow } from "ai-model-verifier/models";
import { useTranslations } from "next-intl";
import { ProviderRowBody, StatCell } from "../shared/provider-row";

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
              <StatCell
                label={t("MODEL_TESTER.RANKINGS.STAT_DETECTIONS")}
                value={provider.sampleCount.toLocaleString()}
              />
              <StatCell
                label={t("MODEL_TESTER.RANKINGS.STAT_MODELS")}
                value={provider.modelCount.toLocaleString()}
              />
              <StatCell
                label={t("MODEL_TESTER.RANKINGS.STAT_PASS_RATE")}
                value={`${Math.round(provider.avgPassRate * 100)}%`}
              />
              <StatCell
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
                    <ProviderRowBody
                      vendor={vendorForRow(model.provider, model.model)}
                      name={model.model}
                      lastTestedAt={model.lastTestedAt}
                      passRate={model.avgPassRate}
                      lowN={lowN}
                      latencyMs={model.avgLatencyMs}
                      meta={
                        t("MODEL_TESTER.RANKINGS.SAMPLES", {
                          count: model.sampleCount,
                        }) +
                        (lowN
                          ? ` · ${t("MODEL_TESTER.RANKINGS.LOW_CONFIDENCE", {
                              count: model.sampleCount,
                            })}`
                          : "")
                      }
                    />
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
