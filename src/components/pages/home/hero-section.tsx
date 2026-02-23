import { Link } from "@/i18n/navigation";
import {
  Activity,
  ChevronRight,
  Zap
} from "lucide-react";
import { getTranslations } from "next-intl/server";

type Props = {
  modelCount: number;
  vendorCount: number;
};

export async function HeroSection(props: Props) {
  const t = await getTranslations();

  return (
    <main className="relative z-10 pt-48 pb-32 px-6 max-w-360 mx-auto flex flex-col lg:flex-row items-center gap-20">
      {/* Left column */}
      <div className="flex-1 w-full text-center lg:text-left space-y-10">
        <div className="space-y-6">
          {/* Status badge */}
          <div className="inline-flex items-center gap-3 px-3 py-1.5 border border-white/10 bg-white/3 backdrop-blur-md rounded-sm">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            <span className="text-[10px] font-mono text-gray-400 tracking-[0.2em] uppercase">
              {t("HOME.HERO_BADGE")}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-white leading-[1.05]">
            {t("HOME.HERO_TITLE_LINE1")} <br />
            <span className="text-gray-500">
              <span className="font-mono tracking-wider">
                {t("HOME.HERO_TITLE_LINE2")}
              </span>
            </span>
            .
          </h1>

          {/* Description */}
          <p className="text-base text-gray-400 max-w-lg mx-auto lg:mx-0 font-light leading-relaxed font-mono">
            {t("HOME.HERO_SUBTITLE")}
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 font-mono text-xs">
          <a
            href="https://api.unorouter.ai/register"
            className="h-11 px-8 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <Zap className="h-3.5 w-3.5" />
            {t("HOME.HERO_CTA_PRIMARY")}
          </a>
          <Link
            href="/models"
            className="h-11 px-8 bg-transparent border border-white/20 text-white font-bold uppercase tracking-widest hover:border-white transition-all w-full sm:w-auto flex items-center justify-center gap-2 group"
          >
            {t("HOME.HERO_CTA_SECONDARY")}
            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-0 border-t border-white/10 w-full">
          <StatCard
            label={t("HOME.STATS_MODELS")}
            value={String(props.modelCount)}
            indicator="Global"
          />
          <StatCard
            label={t("HOME.STATS_PROVIDERS")}
            value={`${props.vendorCount}+`}
            indicator="Integrated"
          />
          <StatCard
            label={t("HOME.STATS_UPTIME")}
            value="99.9%"
            indicator="SLA Guarantee"
          />
        </div>
      </div>

      {/* Right column - Stats panel */}
      <div className="flex-1 w-full max-w-lg lg:max-w-none flex justify-center lg:justify-end">
        <div className="w-full max-w-lg mx-auto lg:mx-0 flex flex-col gap-px bg-white/10 border border-white/10 rounded-lg overflow-hidden backdrop-blur-md">
          {/* Requests served */}
          <div className="bg-[#0A0A0A]/80 p-8 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Requests Served
              </span>
              <Activity className="h-3.5 w-3.5 text-gray-600" />
            </div>
            <div className="text-4xl md:text-5xl lg:text-5xl font-bold text-white tracking-tight tabular-nums">
              847,291,053
            </div>
          </div>

          {/* Sub-stats */}
          <div className="grid grid-cols-2 gap-px bg-white/10">
            <div className="bg-[#0A0A0A]/80 p-6 flex flex-col justify-between h-full">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
                Avg Latency
              </span>
              <div>
                <div className="text-2xl font-bold text-white tabular-nums mb-2">
                  38ms
                </div>
                <div className="w-full h-0.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-white animate-width-expand" />
                </div>
              </div>
            </div>
            <div className="bg-[#0A0A0A]/80 p-6 flex flex-col justify-between h-full">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
                Avg Cost / 1M
              </span>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">$0.42</span>
                  <span className="text-xs text-gray-600 line-through">
                    $2.00
                  </span>
                </div>
                <span className="text-[10px] text-green-500 mt-1 font-mono">
                  79% Savings
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard(props: { label: string; value: string; indicator: string }) {
  return (
    <div className="flex flex-col border border-white/10 p-5 hover:bg-white/2 transition-colors duration-300 cursor-default">
      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">
        {props.label}
      </span>
      <span className="text-2xl font-bold text-white tracking-tight">
        {props.value}
      </span>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-1 h-1 bg-green-500 rounded-full" />
        <span className="text-[10px] font-mono text-gray-400">
          {props.indicator}
        </span>
      </div>
    </div>
  );
}
