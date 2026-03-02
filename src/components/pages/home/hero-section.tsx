import { Link } from "@/i18n/navigation";
import { HeroStatsGrid } from "@/components/pages/home/hero-stats-grid";
import { StatsPanel } from "@/components/pages/home/stats-panel";
import { ScrambleText } from "@/components/elements/scramble-text";
import { LuChevronRight, LuZap } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

export async function HeroSection() {
  const t = await getTranslations();

  return (
    <main className="relative z-10 pt-48 pb-32 px-6 max-w-360 mx-auto flex flex-col lg:flex-row items-center gap-20">
      {/* Left column */}
      <div className="flex-1 w-full text-center lg:text-left space-y-10">
        <div className="space-y-6">
          {/* Status badge */}
          <div className="inline-flex items-center gap-3 px-3 py-1.5 border border-border bg-secondary backdrop-blur-md rounded-sm">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            <span className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase">
              {t("HOME.HERO_BADGE")}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground leading-[1.05]">
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
          <p className="text-base text-muted-foreground max-w-lg mx-auto lg:mx-0 font-light leading-relaxed font-mono">
            {t("HOME.HERO_SUBTITLE")}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 font-mono text-xs">
          <a
            href="https://api.unorouter.ai/register"
            className="h-11 px-8 bg-primary text-primary-foreground font-bold uppercase tracking-widest hover:bg-primary/80 transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <LuZap className="h-3.5 w-3.5" />
            {t("HOME.HERO_CTA_PRIMARY")}
          </a>
          <Link
            href="/models"
            className="h-11 px-8 bg-transparent border border-border text-foreground font-bold uppercase tracking-widest hover:border-foreground transition-all w-full sm:w-auto flex items-center justify-center gap-2 group"
          >
            {t("HOME.HERO_CTA_SECONDARY")}
            <LuChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Stats grid */}
        <HeroStatsGrid />
      </div>

      {/* Right column - Stats panel */}
      <div className="flex-1 w-full max-w-lg lg:max-w-none flex justify-center lg:justify-end">
        <StatsPanel />
      </div>
    </main>
  );
}

