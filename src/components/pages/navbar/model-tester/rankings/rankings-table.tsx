"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  useModelTesterRankings,
  useModelTesterStats,
} from "@/hooks/models/model-tester-rankings-hook";
import { Link } from "@/i18n/navigation";
import { vendorForRow } from "ai-model-verifier/models";
import { APP_VALUES } from "@/lib/config/constants";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RankBar } from "../shared/rank-bar";
import { TESTER_LINKS } from "../shared/links";

const PAGE_SIZE = 20;

function StatsHeader() {
  const t = useTranslations();
  const statsQuery = useModelTesterStats();
  const stats = statsQuery.data;
  const cells = [
    {
      label: t("MODEL_TESTER.RANKINGS.STAT_DETECTIONS"),
      value: (stats?.totalDetections ?? 0).toLocaleString(),
    },
    {
      label: t("MODEL_TESTER.RANKINGS.STAT_PROVIDERS"),
      value: (stats?.providersTracked ?? 0).toLocaleString(),
    },
    {
      label: t("MODEL_TESTER.RANKINGS.STAT_PASS_RATE"),
      value: `${Math.round((stats?.avgPassRate ?? 0) * 100)}%`,
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="bg-card flex flex-col items-center gap-1 overflow-hidden rounded-lg border px-5 py-4 text-center"
        >
          <span className="font-mono text-2xl font-semibold tabular-nums">
            {cell.value}
          </span>
          <span className="text-muted-foreground/80 text-[10px] font-medium tracking-widest uppercase">
            {cell.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RankingsTable() {
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const rankingsQuery = useModelTesterRankings(page, PAGE_SIZE);
  const data = rankingsQuery.data;
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <StatsHeader />

      <div className="bg-card flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-lg border px-5 py-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-foreground inline-flex items-center gap-2 text-sm font-semibold">
            <Icon name="shield-check" className="text-primary size-4" />
            {t("MODEL_TESTER.RANKINGS.SELF_TITLE")}
          </span>
          <span className="text-muted-foreground text-sm">
            {t("MODEL_TESTER.RANKINGS.SELF_BODY", {
              appName: APP_VALUES.appName,
            })}
          </span>
        </div>
        <a
          href={TESTER_LINKS.source}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground inline-flex shrink-0 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          <Icon name="brand-github" className="size-4" />
          {t("MODEL_TESTER.RANKINGS.REPORT_GITHUB")}
        </a>
      </div>

      <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-relaxed">
        <span>{t("MODEL_TESTER.RANKINGS.DISCLAIMER")}</span>
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
          href={TESTER_LINKS.issuesNew}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
        >
          <Icon name="brand-github" className="size-3.5" />
          {t("MODEL_TESTER.RANKINGS.REPORT_GITHUB")}
        </a>
      </p>

      {rows.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          {t("MODEL_TESTER.RANKINGS.EMPTY")}
        </p>
      ) : (
        <>
          <div className="bg-card flex flex-col divide-y overflow-hidden rounded-lg border">
            {rows.map((row) => {
              const passPct = Math.round(row.avgPassRate * 100);
              const lowN = row.sampleCount < 5;
              return (
                <Link
                  key={row.baseUrlHost}
                  href={{
                    pathname: "/ai-api-model-tester/rankings/[host]",
                    params: { host: encodeURIComponent(row.baseUrlHost) },
                  }}
                  className="hover:bg-muted/30 flex items-center gap-3 px-4 py-3 transition-colors sm:gap-4 sm:px-5"
                >
                  <VendorIcon
                    vendor={vendorForRow(row.provider)}
                    size={22}
                    className="shrink-0"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium">
                        {row.baseUrlHost}
                      </span>
                      <span className="text-foreground/70 shrink-0 text-xs">
                        {t("MODEL_TESTER.RANKINGS.LAST_TESTED", {
                          when: dayjs(row.lastTestedAt).fromNow(),
                        })}
                      </span>
                    </div>
                    <RankBar pct={passPct} lowN={lowN} />
                    <span className="text-muted-foreground truncate text-xs">
                      <span className="font-mono tabular-nums">
                        {Math.round(row.avgLatencyMs)}ms
                      </span>
                      {" · "}
                      {t("MODEL_TESTER.RANKINGS.MODELS_TRACKED", {
                        count: row.modelCount,
                      })}{" "}
                      ·{" "}
                      {t("MODEL_TESTER.RANKINGS.SAMPLES", {
                        count: row.sampleCount,
                      })}
                      {lowN
                        ? ` · ${t("MODEL_TESTER.RANKINGS.LOW_CONFIDENCE", {
                            count: row.sampleCount,
                          })}`
                        : ""}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Icon name="chevron-left" className="size-4" />
              {t("MODEL_TESTER.RANKINGS.PREV")}
            </Button>
            <span className="text-muted-foreground text-sm">
              {page} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              {t("MODEL_TESTER.RANKINGS.NEXT")}
              <Icon name="chevron-right" className="size-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
