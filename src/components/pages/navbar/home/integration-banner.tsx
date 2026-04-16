import { Link } from "@/i18n/navigation";
import { APP_VALUES, msg } from "@/lib/config/constants";
import Claude from "@lobehub/icons/es/Claude";
import Codex from "@lobehub/icons/es/Codex";
import Gemini from "@lobehub/icons/es/Gemini";
import { getTranslations } from "next-intl/server";
import type { ComponentType } from "react";
import { GiCrabClaw } from "react-icons/gi";
import { LuArrowRight } from "react-icons/lu";

const integrations = [
  {
    href: "/docs/claude-code",
    icon: Claude.Color,
    badge: "Claude Code",
    titleKey: msg("HOME.INTEGRATION.CLAUDE_CODE.TITLE"),
    descKey: msg("HOME.INTEGRATION.CLAUDE_CODE.DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION.CLAUDE_CODE.BADGE"),
    color: "orange",
  },
  {
    href: "/docs/codex",
    icon: Codex.Color,
    badge: "Codex CLI",
    titleKey: msg("HOME.INTEGRATION.CODEX.TITLE"),
    descKey: msg("HOME.INTEGRATION.CODEX.DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION.CODEX.BADGE"),
    color: "emerald",
  },
  {
    href: "/docs/gemini-cli",
    icon: Gemini.Color,
    badge: "Gemini CLI",
    titleKey: msg("HOME.INTEGRATION.GEMINI_CLI.TITLE"),
    descKey: msg("HOME.INTEGRATION.GEMINI_CLI.DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION.GEMINI_CLI.BADGE"),
    color: "blue",
  },
  {
    href: "/docs/openclaw",
    icon: GiCrabClaw as ComponentType<{ className?: string; size?: number }>,
    badge: "OpenClaw",
    titleKey: msg("HOME.INTEGRATION.OPENCLAW.TITLE"),
    descKey: msg("HOME.INTEGRATION.OPENCLAW.DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION.OPENCLAW.BADGE"),
    color: "red",
  },
] as const;

const colorMap = {
  orange: {
    glow: "bg-orange-600/20",
    badge: "bg-orange-600/20 text-orange-500",
    border: "border-orange-600/20 hover:border-orange-600/50",
    hoverBg: "hover:bg-orange-600/5",
    ring: "border-orange-600/30 group-hover:bg-orange-600 group-hover:border-orange-600",
    arrow: "text-orange-500",
  },
  emerald: {
    glow: "bg-emerald-600/20",
    badge: "bg-emerald-600/20 text-emerald-500",
    border: "border-emerald-600/20 hover:border-emerald-600/50",
    hoverBg: "hover:bg-emerald-600/5",
    ring: "border-emerald-600/30 group-hover:bg-emerald-600 group-hover:border-emerald-600",
    arrow: "text-emerald-500",
  },
  blue: {
    glow: "bg-blue-600/20",
    badge: "bg-blue-600/20 text-blue-500",
    border: "border-blue-600/20 hover:border-blue-600/50",
    hoverBg: "hover:bg-blue-600/5",
    ring: "border-blue-600/30 group-hover:bg-blue-600 group-hover:border-blue-600",
    arrow: "text-blue-500",
  },
  red: {
    glow: "bg-red-600/20",
    badge: "bg-red-600/20 text-red-500",
    border: "border-red-600/20 hover:border-red-600/50",
    hoverBg: "hover:bg-red-600/5",
    ring: "border-red-600/30 group-hover:bg-red-600 group-hover:border-red-600",
    arrow: "text-red-500",
  },
} as const;

export async function IntegrationBanner() {
  const t = await getTranslations();

  return (
    <section className="border-border/50 relative border-t border-b bg-linear-to-r from-orange-600/5 via-transparent to-red-600/5 py-8">
      <div className="mx-auto max-w-360 px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {integrations.map((integration) => {
            const colors = colorMap[integration.color];
            return (
              <Link
                key={integration.href}
                href={integration.href}
                className={`group flex flex-col gap-4 rounded-lg border px-6 py-4 ${colors.border} bg-card/40 backdrop-blur-sm ${colors.hoverBg} transition-all duration-300`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div
                      className={`absolute inset-0 ${colors.glow} rounded-full blur-xl`}
                    />
                    <integration.icon size={40} className="relative" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase ${colors.badge} rounded`}
                      >
                        {integration.badge}
                      </span>
                    </div>
                    <h2 className="text-foreground text-base leading-tight font-bold tracking-tight md:text-lg">
                      {t(integration.titleKey)}
                    </h2>
                  </div>
                </div>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  {t(integration.descKey, APP_VALUES)}
                </p>
                <div className="mt-auto flex items-center justify-end gap-3 pt-2 md:justify-start">
                  <span className="text-foreground/70 group-hover:text-foreground font-mono text-sm transition-colors">
                    {t("HOME.INTEGRATION.VIEW_GUIDE")}
                  </span>
                  <div
                    className={`h-8 w-8 rounded-full border ${colors.ring} flex items-center justify-center transition-all`}
                  >
                    <LuArrowRight
                      className={`h-3.5 w-3.5 ${colors.arrow} transition-colors group-hover:text-white`}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
