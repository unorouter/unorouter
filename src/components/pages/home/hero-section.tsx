import { Link } from "@/i18n/navigation";
import { HeroStatsGrid } from "@/components/pages/home/hero-stats-grid";
import { HeroSubtitle } from "@/components/pages/home/hero-subtitle";
import { StatsPanel } from "@/components/pages/home/stats-panel";
import { ScrambleText } from "@/components/elements/scramble-text";
import { LuChevronRight, LuZap } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

export async function HeroSection() {
  const t = await getTranslations();

  return (
    <main className="relative z-10 mx-auto flex max-w-360 flex-col items-center gap-20 px-6 pt-48 pb-32 lg:flex-row">
      {/* Left column */}
      <div className="w-full flex-1 space-y-10 text-center lg:text-left">
        <div className="space-y-6">
          {/* Status badge */}
          <div className="border-border bg-secondary inline-flex items-center gap-3 rounded-sm border px-3 py-1.5 backdrop-blur-md">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
            </span>
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
              {t("HOME.HERO_BADGE")}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-foreground text-[2.5rem] leading-[1.05] font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            {t("HOME.HERO_TITLE_LINE1")} <br />
            <span className="text-muted-foreground">
              <ScrambleText
                text={t("HOME.HERO_TITLE_LINE2")}
                className="font-mono tracking-wider"
              />
            </span>
            .
          </h1>

          {/* Description */}
          <HeroSubtitle />
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 font-mono text-xs sm:flex-row lg:justify-start">
          <a
            href="https://api.unorouter.ai/register"
            className="bg-primary text-primary-foreground hover:bg-primary/80 flex h-11 w-full items-center justify-center gap-2 px-8 font-bold tracking-widest uppercase transition-colors sm:w-auto"
          >
            <LuZap className="h-3.5 w-3.5" />
            {t("HOME.HERO_CTA_PRIMARY")}
          </a>
          <Link
            href="/models"
            className="border-border text-foreground hover:border-foreground group flex h-11 w-full items-center justify-center gap-2 border bg-transparent px-8 font-bold tracking-widest uppercase transition-all sm:w-auto"
          >
            {t("HOME.HERO_CTA_SECONDARY")}
            <LuChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Stats grid */}
        <HeroStatsGrid />
      </div>

      {/* Right column - Stats panel */}
      <div className="flex w-full max-w-lg flex-1 justify-center lg:max-w-none lg:justify-end">
        <StatsPanel />
      </div>
    </main>
  );
}
