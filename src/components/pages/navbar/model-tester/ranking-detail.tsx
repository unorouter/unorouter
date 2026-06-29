"use client";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import {
  useDeletePublishedTest,
  usePublishedTestDetail,
  useRankingDetail,
} from "@/hooks/models/model-tester-rankings-hook";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Link } from "@/i18n/navigation";
import { vendorForRow } from "@/lib/ai/verify/models";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RankBar, RankPill } from "./rank-bar";
import {
  fromPublishedTestDetail,
  type PublishedTestDetailData,
} from "./result-adapters";
import { TestResultCard } from "./test-result-card";
import { TESTER_LINKS, githubReportUrl } from "./links";
import type { RankingRecentRow } from "@/lib/api/typebox/model-tester";

const PAGE_SIZE = 5;

export function RankingDetail(props: { host: string; model: string }) {
  const t = useTranslations();
  const userId = useLocalUserId();
  const detailQuery = useRankingDetail(props.host, props.model);
  const deletePublished = useDeletePublishedTest(props.host, props.model);
  const [page, setPage] = useState(0);
  const detail = detailQuery.data;
  const agg = detail?.aggregate;
  const recent = detail?.recent ?? [];

  const pageCount = Math.max(1, Math.ceil(recent.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = recent.slice(
    current * PAGE_SIZE,
    current * PAGE_SIZE + PAGE_SIZE,
  );

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
                    vendor={vendorForRow(agg.provider, props.model)}
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
            <div className="flex flex-col gap-3 px-5 py-4">
              {pageRows.map((row, i) => (
                <PublishedTestRow
                  key={row.id}
                  rank={current * PAGE_SIZE + i + 1}
                  row={row}
                  host={props.host}
                  model={props.model}
                  mine={
                    row.submitterUserId !== null &&
                    row.submitterUserId !== GUEST_USER_ID &&
                    row.submitterUserId === userId
                  }
                  onDelete={() => onDelete(row.id)}
                />
              ))}
            </div>
            {pageCount > 1 ? (
              <div className="flex items-center justify-center gap-3 border-t px-5 py-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                >
                  <Icon name="chevron-left" className="size-4" />
                  {t("MODEL_TESTER.DETAIL.PREV")}
                </Button>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {t("MODEL_TESTER.DETAIL.PAGE_OF", {
                    page: current + 1,
                    total: pageCount,
                  })}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={current >= pageCount - 1}
                  onClick={() => setPage(current + 1)}
                >
                  {t("MODEL_TESTER.DETAIL.NEXT")}
                  <Icon name="chevron-right" className="size-4" />
                </Button>
              </div>
            ) : null}
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

// One published submission rendered inline as the unified result card (its own
// outer accordion, driven by the global open atom). No deeper click: the probe
// evidence lives right here. Detail (probes) is lazy-fetched per visible row.
function PublishedTestRow(props: {
  rank: number;
  row: RankingRecentRow;
  host: string;
  model: string;
  mine: boolean;
  onDelete: () => void;
}) {
  const t = useTranslations();
  const detailQuery = usePublishedTestDetail(props.row.id);
  const detail = detailQuery.data as PublishedTestDetailData | null | undefined;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <RankPill rank={props.rank} />
          <span className="text-muted-foreground text-xs">
            {t("MODEL_TESTER.DETAIL.SUBMITTED_BY", {
              who:
                props.row.submitterUsername ??
                t("MODEL_TESTER.DETAIL.ANONYMOUS"),
            })}
          </span>
        </div>
        {props.mine ? null : (
          <a
            href={githubReportUrl(props.host, props.model)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
          >
            <Icon name="brand-github" className="size-3.5" />
            {t("MODEL_TESTER.DETAIL.REPORT")}
          </a>
        )}
      </div>
      {detail ? (
        <TestResultCard
          result={fromPublishedTestDetail(detail)}
          timestamp={dayjs(props.row.testedAt).fromNow()}
          onDelete={props.mine ? props.onDelete : undefined}
        />
      ) : (
        <p className="text-muted-foreground bg-card rounded-lg border px-5 py-4 text-sm">
          {t("MODEL_TESTER.DETAIL.LOADING")}
        </p>
      )}
    </div>
  );
}
