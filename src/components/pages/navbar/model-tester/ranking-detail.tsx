"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import {
  useDeletePublishedTest,
  useRankingDetail,
} from "@/hooks/models/model-tester-rankings-hook";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Link } from "@/i18n/navigation";
import { vendorForRow } from "@/lib/ai/verify/models";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { RankBar, RankPill } from "./rank-bar";
import { TESTER_LINKS, githubReportUrl } from "./links";
import type { VerifyProvider } from "@/lib/ai/verify/types";
import type { TranslationKey } from "@/lib/types";

const VERDICT_BADGE: Record<string, "default" | "destructive" | "secondary"> = {
  genuine: "default",
  suspicious: "destructive",
  unverified: "secondary",
};
const VERDICT_KEY: Record<string, TranslationKey> = {
  genuine: "MODEL_TESTER.VERDICT.GENUINE",
  suspicious: "MODEL_TESTER.VERDICT.SUSPICIOUS",
  unverified: "MODEL_TESTER.VERDICT.UNVERIFIED",
};

export function RankingDetail(props: { host: string; model: string }) {
  const t = useTranslations();
  const userId = useLocalUserId();
  const detailQuery = useRankingDetail(props.host, props.model);
  const deletePublished = useDeletePublishedTest(props.host, props.model);
  const detail = detailQuery.data;
  const agg = detail?.aggregate;
  const recent = detail?.recent ?? [];

  async function onDelete(id: string) {
    const ok = await confirm({
      title: t("MODEL_TESTER.DETAIL.DELETE_TITLE"),
      description: t("MODEL_TESTER.DETAIL.DELETE_BODY"),
      confirmLabel: t("MODEL_TESTER.DETAIL.DELETE_CONFIRM"),
      cancelLabel: t("MODEL_TESTER.DETAIL.DELETE_CANCEL"),
      destructive: true,
    });
    if (ok) deletePublished.mutate(id);
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={{
          pathname: "/ai-api-model-tester/rankings/[host]",
          params: { host: encodeURIComponent(props.host) },
        }}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm transition-colors"
      >
        <Icon name="arrow-left" className="size-4" />
        {t("MODEL_TESTER.DETAIL.BACK_TO_PROVIDER")}
      </Link>

      {!agg ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("MODEL_TESTER.DETAIL.NOT_FOUND")}
        </p>
      ) : (
        <>
          <section className="bg-card overflow-hidden rounded-lg border">
            <header className="flex flex-col gap-3 px-5 py-4">
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold">{props.host}</span>
                <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <VendorIcon
                    vendor={vendorForRow(
                      agg.provider as VerifyProvider,
                      props.model,
                    )}
                    size={14}
                    className="shrink-0"
                  />
                  {props.model}
                </span>
              </div>
              <RankBar
                pct={Math.round(agg.avgPassRate * 100)}
                lowN={agg.sampleCount < 5}
              />
            </header>
            <div className="flex flex-col gap-4 border-t px-5 py-5">
              <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span>
                  {t("MODEL_TESTER.RANKINGS.SAMPLES", {
                    count: agg.sampleCount,
                  })}
                </span>
                <span>
                  {t("MODEL_TESTER.RESULT.LATENCY", {
                    ms: Math.round(agg.avgLatencyMs),
                  })}
                </span>
                {agg.p95LatencyMs !== null ? (
                  <span>
                    {t("MODEL_TESTER.RANKINGS.P95", {
                      ms: Math.round(agg.p95LatencyMs),
                    })}
                  </span>
                ) : null}
                {agg.avgTotalTokens !== null ? (
                  <span>
                    {t("MODEL_TESTER.RESULT.TOTAL_TOKENS", {
                      tokens: Math.round(agg.avgTotalTokens),
                    })}
                  </span>
                ) : null}
                <span>
                  {t("MODEL_TESTER.RANKINGS.LAST_TESTED", {
                    when: dayjs(agg.lastTestedAt).fromNow(),
                  })}
                </span>
              </div>
              <div className="flex gap-4 text-sm">
                <span>
                  {t("MODEL_TESTER.VERDICT.GENUINE")}: {agg.genuineCount}
                </span>
                <span>
                  {t("MODEL_TESTER.VERDICT.SUSPICIOUS")}: {agg.suspiciousCount}
                </span>
                <span>
                  {t("MODEL_TESTER.VERDICT.UNVERIFIED")}: {agg.unverifiedCount}
                </span>
              </div>
              <p className="text-muted-foreground border-t pt-3 text-xs leading-relaxed">
                {t("MODEL_TESTER.DETAIL.DISCLAIMER")}
              </p>
            </div>
          </section>

          <section className="bg-card overflow-hidden rounded-lg border">
            <header className="border-b px-5 py-4">
              <span className="text-base font-semibold">
                {t("MODEL_TESTER.DETAIL.SUBMISSIONS")}
              </span>
            </header>
            <div className="divide-border divide-y">
              {recent.map((row, i) => {
                const mine =
                  row.submitterUserId !== null &&
                  row.submitterUserId !== GUEST_USER_ID &&
                  row.submitterUserId === userId;
                return (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <RankPill rank={i + 1} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-2 text-sm">
                        <Badge
                          variant={VERDICT_BADGE[row.verdict] ?? "secondary"}
                        >
                          {t(
                            VERDICT_KEY[row.verdict] ??
                              "MODEL_TESTER.VERDICT.UNVERIFIED",
                          )}
                        </Badge>
                        <span className="text-muted-foreground">
                          {row.probesPassed}/{row.probesTotal}
                        </span>
                      </span>
                      <span className="text-muted-foreground truncate text-xs">
                        {t("MODEL_TESTER.DETAIL.SUBMITTED_BY", {
                          who:
                            row.submitterUsername ??
                            t("MODEL_TESTER.DETAIL.ANONYMOUS"),
                        })}{" "}
                        · {dayjs(row.testedAt).fromNow()}
                      </span>
                      {row.detectedModel ? (
                        <span className="text-muted-foreground truncate text-xs">
                          {t("MODEL_TESTER.RESULT.DETECTED_MODEL")}:{" "}
                          <span className="font-mono">{row.detectedModel}</span>
                        </span>
                      ) : null}
                      <span className="text-muted-foreground truncate font-mono text-[11px] tabular-nums">
                        {Math.round(row.latencyMs)}ms
                        {row.totalTokens !== null
                          ? ` · ${row.totalTokens} tok`
                          : ""}
                        {row.transport ? ` · ${row.transport}` : ""}
                      </span>
                    </div>
                    {mine ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(row.id)}
                      >
                        <Icon name="trash-2" className="size-4" />
                        {t("MODEL_TESTER.DETAIL.DELETE_MINE")}
                      </Button>
                    ) : (
                      <div className="flex shrink-0 items-center gap-3">
                        <a
                          href={githubReportUrl(props.host, props.model)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                        >
                          <Icon name="brand-github" className="size-3.5" />
                          {t("MODEL_TESTER.DETAIL.REPORT")}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-5 py-3 text-xs">
              <span>{t("MODEL_TESTER.DETAIL.REPORT_HELP")}</span>
              <a
                href={TESTER_LINKS.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
              >
                <Icon name="brand-discord" className="size-3.5" />
                {t("MODEL_TESTER.RANKINGS.REPORT_DISCORD")}
              </a>
              <a
                href={githubReportUrl(props.host, props.model)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
              >
                <Icon name="brand-github" className="size-3.5" />
                {t("MODEL_TESTER.RANKINGS.REPORT_GITHUB")}
              </a>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
