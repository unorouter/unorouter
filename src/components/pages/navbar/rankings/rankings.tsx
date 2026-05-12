"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useRankingsQuery } from "@/hooks/rankings-hook";
import type { RankingPeriod } from "@/lib/api/typebox/rankings";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MarketShareSection } from "./market-share-section";
import { ModelsSection } from "./models-section";
import { PulseSection } from "./pulse-section";
import { RankingsHero } from "./rankings-hero";

const VALID_PERIODS: RankingPeriod[] = [
  "today",
  "week",
  "month",
  "year",
  "all",
];

function isValidPeriod(
  value: string | null | undefined,
): value is RankingPeriod {
  return !!value && (VALID_PERIODS as string[]).includes(value);
}

type RankingsProps = {
  initialPeriod: RankingPeriod;
};

export function Rankings(props: RankingsProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const periodParam = searchParams.get("period");
  const period: RankingPeriod = isValidPeriod(periodParam)
    ? periodParam
    : props.initialPeriod;

  const rankingsQuery = useRankingsQuery(period);
  const snapshot = rankingsQuery.data;

  function handlePeriodChange(next: RankingPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

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
        <RankingsHero period={period} onPeriodChange={handlePeriodChange} />

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
            <ModelsSection
              history={snapshot.models_history}
              rows={snapshot.models}
              period={period}
            />

            <MarketShareSection
              history={snapshot.vendor_share_history}
              rows={snapshot.vendors}
              period={period}
            />

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
