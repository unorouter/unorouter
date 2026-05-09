"use client";

import type { RankingPeriod } from "@/lib/api/typebox/rankings";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const PERIODS = [
  { id: "today", key: "RANKINGS.PERIODS.TODAY" },
  { id: "week", key: "RANKINGS.PERIODS.WEEK" },
  { id: "month", key: "RANKINGS.PERIODS.MONTH" },
  { id: "year", key: "RANKINGS.PERIODS.YEAR" },
  { id: "all", key: "RANKINGS.PERIODS.ALL" },
] as const satisfies ReadonlyArray<{ id: RankingPeriod; key: string }>;

type RankingsHeroProps = {
  period: RankingPeriod;
  onPeriodChange: (period: RankingPeriod) => void;
};

export function RankingsHero(props: RankingsHeroProps) {
  const t = useTranslations();

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          {t("RANKINGS.HERO.EYEBROW")}
        </p>
        <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.15] font-bold tracking-tight">
          {t("RANKINGS.HERO.TITLE")}
        </h1>
        <p className="text-muted-foreground/80 max-w-2xl text-sm">
          {t("RANKINGS.HERO.SUBTITLE")}
        </p>
      </div>

      <div
        role="tablist"
        aria-label={t("RANKINGS.HERO.EYEBROW")}
        className="border-border/60 flex items-center border-b"
      >
        {PERIODS.map((p) => {
          const isActive = props.period === p.id;
          return (
            <button
              key={p.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => props.onPeriodChange(p.id)}
              className={cn(
                "focus-visible:ring-ring/40 relative -mb-px rounded-sm px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(p.key)}
              <span
                aria-hidden
                className={cn(
                  "bg-foreground absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-opacity",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
