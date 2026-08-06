"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useRankingsQuery } from "@/hooks/models/rankings-hook";
import type { RankingPeriod } from "@/lib/api/typebox/rankings";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Suspense } from "react";
import { PulseSection } from "./pulse-section";
import { RANKING_PERIODS } from "./rankings-helpers";
import { RankingsHero } from "./rankings-hero";

const ModelsSection = dynamic(
  () => import("./models-section").then((m) => m.ModelsSection),
  { ssr: false, loading: () => <Skeleton className="h-150 w-full" /> },
);
const MarketShareSection = dynamic(
  () => import("./market-share-section").then((m) => m.MarketShareSection),
  { ssr: false, loading: () => <Skeleton className="h-150 w-full" /> },
);

type RankingsProps = {
  initialPeriod: RankingPeriod;
};

const PERIOD_IDS = RANKING_PERIODS.map((p) => p.id);

export function Rankings(props: RankingsProps) {
  const t = useTranslations();

  const [period, handlePeriodChange] = useQueryState(
    "period",
    parseAsStringLiteral(PERIOD_IDS).withDefault(
      props.initialPeriod as (typeof PERIOD_IDS)[number],
    ),
  );

  const rankingsQuery = useRankingsQuery(period);
  const snapshot = rankingsQuery.data;

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-150 opacity-20 dark:opacity-[0.10]"
        style={{
          background: [
            "radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.72 0.18 250 / 80%) 0%, transparent 70%)",
            "radial-gradient(ellipse 50% 40% at 80% 15%, oklch(0.65 0.15 200 / 60%) 0%, transparent 70%)",
            "radial-gradient(ellipse 40% 35% at 50% 70%, oklch(0.70 0.12 280 / 40%) 0%, transparent 70%)",
          ].join(", "),
          maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 40%, transparent 100%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-7xl space-y-8 px-3 pt-16 pb-10 sm:px-6 sm:pt-20 sm:pb-12 xl:px-8">
        <RankingsHero
          period={period}
          onPeriodChange={(p) =>
            handlePeriodChange(PERIOD_IDS.find((id) => id === p) ?? "week")
          }
        />

        {rankingsQuery.isLoading ? (
          <RankingsLoading />
        ) : !snapshot ? (
          <RankingsError
            message={
              rankingsQuery.error instanceof Error
                ? rankingsQuery.error.message
                : t("RANKINGS.ERROR.GENERIC")
            }
          />
        ) : (
          <>
            <Suspense fallback={<Skeleton className="h-150 w-full" />}>
              <ModelsSection
                history={snapshot.models_history}
                rows={snapshot.models}
                period={period}
              />
            </Suspense>

            <Suspense fallback={<Skeleton className="h-150 w-full" />}>
              <MarketShareSection
                history={snapshot.vendor_share_history}
                rows={snapshot.vendors}
                period={period}
              />
            </Suspense>

            <PulseSection
              movers={snapshot.top_movers}
              droppers={snapshot.top_droppers}
            />
          </>
        )}
      </div>
    </div>
  );
}

function RankingsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-105 w-full rounded-xl" />
      <Skeleton className="h-90 w-full rounded-xl" />
      <Skeleton className="h-45 w-full rounded-xl" />
    </div>
  );
}

function RankingsError(props: { message: string }) {
  const t = useTranslations();
  return (
    <div className="bg-card rounded-xl border border-dashed px-6 py-12 text-center">
      <h2 className="text-foreground text-base font-semibold">
        {t("RANKINGS.ERROR.TITLE")}
      </h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
        {props.message}
      </p>
    </div>
  );
}
