"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import { useHistoryModels } from "@/hooks/ai/model-tester/tester-hooks";
import { Link } from "@/i18n/navigation";
import { vendorForRow } from "@unorouter/verify-core/models";
import { useTranslations } from "next-intl";
import { ProviderRowBody, StatCell } from "../shared/provider-row";
import { totalSamples, weightedPassRate } from "../shared/stats";

export function HistoryProviderDetail(props: { host: string }) {
  const t = useTranslations();
  const modelsQuery = useHistoryModels(props.host);
  const data = modelsQuery.data;
  const models = data?.models ?? [];
  const sampleTotal = totalSamples(models);
  const passPercent = Math.round(weightedPassRate(models) * 100);

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
            <StatCell
              label={t("MODEL_TESTER.RANKINGS.STAT_DETECTIONS")}
              value={sampleTotal.toLocaleString()}
            />
            <StatCell
              label={t("MODEL_TESTER.RANKINGS.STAT_MODELS")}
              value={models.length.toLocaleString()}
            />
            <StatCell
              label={t("MODEL_TESTER.RANKINGS.STAT_PASS_RATE")}
              value={`${passPercent}%`}
            />
          </div>
          <div className="divide-border divide-y border-t">
            {models.map((model) => (
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
                <ProviderRowBody
                  vendor={vendorForRow(model.provider, model.requestedModel)}
                  name={model.requestedModel}
                  lastTestedAt={model.lastTestedAt}
                  passRate={model.avgPassRate}
                  latencyMs={model.avgLatencyMs}
                  meta={t("MODEL_TESTER.RANKINGS.SAMPLES", {
                    count: model.sampleCount,
                  })}
                />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
