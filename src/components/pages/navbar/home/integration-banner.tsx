import { Link } from "@/i18n/navigation";
import { APP_VALUES, msg } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { LuArrowRight } from "react-icons/lu";

const integrations = [
  {
    href: "/docs/claude-code",
    image: "/images/claude-code-screenshot.png",
    alt: "Claude Code",
    titleKey: msg("HOME.INTEGRATION_CLAUDE_CODE_TITLE"),
    descKey: msg("HOME.INTEGRATION_CLAUDE_CODE_DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION_CLAUDE_CODE_BADGE"),
    color: "orange",
  },
  {
    href: "/docs/codex",
    image: "/images/codex-screenshot.png",
    alt: "Codex CLI",
    titleKey: msg("HOME.INTEGRATION_CODEX_TITLE"),
    descKey: msg("HOME.INTEGRATION_CODEX_DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION_CODEX_BADGE"),
    color: "emerald",
  },
  {
    href: "/docs/gemini-cli",
    image: "/images/gemini-cli-screenshot.png",
    alt: "Gemini CLI",
    titleKey: msg("HOME.INTEGRATION_GEMINI_CLI_TITLE"),
    descKey: msg("HOME.INTEGRATION_GEMINI_CLI_DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION_GEMINI_CLI_BADGE"),
    color: "blue",
  },
  {
    href: "/docs/openclaw",
    image: "/images/openclaw-screenshot.png",
    alt: "OpenClaw",
    titleKey: msg("HOME.INTEGRATION_OPENCLAW_TITLE"),
    descKey: msg("HOME.INTEGRATION_OPENCLAW_DESCRIPTION"),
    badgeKey: msg("HOME.INTEGRATION_OPENCLAW_BADGE"),
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
    <section className="border-border/50 relative border-t border-b bg-linear-to-r from-orange-600/5 via-transparent to-red-600/5 px-6 py-8">
      <div className="mx-auto max-w-360">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    <Image
                      src={integration.image}
                      alt={integration.alt}
                      width={80}
                      height={48}
                      className="relative w-20 rounded"
                      style={{ width: "auto", height: "auto" }}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase ${colors.badge} rounded`}
                      >
                        {integration.alt}
                      </span>
                    </div>
                    <h3 className="text-foreground text-base leading-tight font-bold tracking-tight md:text-lg">
                      {t(integration.titleKey)}
                    </h3>
                  </div>
                </div>
                <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                  {t(integration.descKey, APP_VALUES)}
                </p>
                <div className="mt-auto flex items-center gap-3 pt-2">
                  <span className="text-foreground/70 group-hover:text-foreground font-mono text-sm transition-colors">
                    {t("HOME.INTEGRATION_VIEW_GUIDE")}
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
