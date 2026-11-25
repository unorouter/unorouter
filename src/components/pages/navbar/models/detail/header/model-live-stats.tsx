import { APP_VALUES } from "@/lib/config/constants";
import { getVendorTheme } from "@/lib/config/vendor-registry";
import { formatLatency, formatTps } from "@/lib/utils/format/number";
import { getWeeklyModelStats } from "@/server/models/perf-metrics/perf-metrics.service";
import { getTranslations } from "next-intl/server";
import { SectionHeading } from "../shared/section-heading";
import { StatCard } from "../tabs/stat-card";

// Below this a week of traffic is too thin to state as a fact on the page.
const MIN_REQUESTS = 50;
// Below this the rate is left to the live uptime chart further down.
const MIN_SHOWN_SUCCESS = 90;

// Server rendered so the page's own measured numbers are in the HTML crawlers
// index, unlike the client charts below.
export async function ModelLiveStats(props: {
  modelName: string;
  providers: number;
  theme: ReturnType<typeof getVendorTheme>;
}) {
  if (props.modelName.endsWith(":free")) return null;
  const stats = await getWeeklyModelStats(props.modelName);
  if (!stats || stats.requests < MIN_REQUESTS) return null;
  const t = await getTranslations();

  const showSuccess = stats.successRate >= MIN_SHOWN_SUCCESS;
  const values = {
    ...APP_VALUES,
    model: props.modelName,
    success: stats.successRate.toFixed(1),
    ttft: formatLatency(stats.ttftMs, 1),
    tps: formatTps(stats.tps),
    providers: props.providers,
  };

  return (
    <section className="mt-12">
      <SectionHeading theme={props.theme}>
        {t("MODEL_PAGE.LIVE_TITLE", APP_VALUES)}
      </SectionHeading>
      <p className="text-muted-foreground mb-3 text-sm">
        {showSuccess
          ? t("MODEL_PAGE.LIVE_SUMMARY", values)
          : t("MODEL_PAGE.LIVE_SUMMARY_NO_SUCCESS", values)}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {showSuccess && (
          <StatCard
            label={t("MODEL_PAGE.LIVE_SUCCESS")}
            value={`${values.success}%`}
            intent="success"
          />
        )}
        {stats.ttftMs > 0 && (
          <StatCard label={t("MODEL_PAGE.LIVE_TTFT")} value={values.ttft} />
        )}
        {stats.tps > 0 && (
          <StatCard label={t("MODEL_PAGE.LIVE_TPS")} value={values.tps} />
        )}
        {props.providers > 0 && (
          <StatCard
            label={t("MODEL_PAGE.LIVE_PROVIDERS")}
            value={String(props.providers)}
          />
        )}
      </div>
    </section>
  );
}
