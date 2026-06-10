import { GetStartedLink } from "@/components/elements/brand/get-started-link";
import { Link } from "@/i18n/navigation";
import { FloatingIntegrations } from "@/components/pages/navbar/home/floating-integrations";
import {
  HeroStatsGrid,
  type HeroCounts,
} from "@/components/pages/navbar/home/hero-stats-grid";
import { HeroSubtitle } from "@/components/pages/navbar/home/hero-subtitle";
import { StatsPanel } from "@/components/pages/navbar/home/stats-panel";
import { ScrambleRotate } from "@/components/elements/fx/scramble-rotate";
import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/ui/icon";

export async function HeroSection(props: { counts: HeroCounts }) {
  const t = await getTranslations();

  return (
    <main className="relative z-10 mx-auto flex max-w-360 flex-col items-center gap-10 px-6 pt-24 pb-16 lg:flex-row lg:gap-20 lg:pt-48 lg:pb-32">
      {/* Left column */}
      <div className="w-full flex-1 space-y-6 text-center lg:space-y-10 lg:text-left">
        <div className="space-y-6">
          {/* Status badge */}
          <div className="border-border bg-secondary inline-flex items-center gap-3 rounded-sm border px-3 py-1.5 backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
              {t("HOME.HERO.BADGE")}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-foreground text-[2.5rem] leading-[1.05] font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            {t("HOME.HERO.TITLE_LINE1")} <br />
            <span className="text-muted-foreground">
              <ScrambleRotate
                words={t("HOME.HERO.TITLE_ROTATE")
                  .split(",")
                  .map((w) => w.trim())
                  .filter((w) => w.length > 0)}
                className="font-mono tracking-wider"
              />
            </span>
            .
          </h1>

          {/* Description */}
          <HeroSubtitle modelCount={props.counts.modelCount} />
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 font-mono text-xs sm:flex-row lg:justify-start">
          <GetStartedLink
            className="bg-primary text-primary-foreground hover:bg-primary/80 flex h-11 w-full items-center justify-center gap-2 px-8 font-bold tracking-widest uppercase transition-colors sm:w-auto"
            icon={<Icon name="zap" className="h-3.5 w-3.5" />}
          />
          <Link
            href="/models"
            className="border-border text-foreground hover:border-foreground group flex h-11 w-full items-center justify-center gap-2 border bg-transparent px-8 font-bold tracking-widest uppercase transition-all sm:w-auto"
          >
            {t("HOME.HERO.CTA_SECONDARY")}
            <Icon
              name="chevron-right"
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>

        {/* Stats grid */}
        <HeroStatsGrid counts={props.counts} />
      </div>

      {/* Right column - Stats panel with floating integration logos on desktop */}
      <div className="flex w-full max-w-lg flex-1 justify-center lg:max-w-none lg:justify-end">
        <div className="relative w-full max-w-lg">
          <FloatingIntegrations />
          <StatsPanel />
        </div>
      </div>
    </main>
  );
}
