import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { LuArrowRight } from "react-icons/lu";

const integrations = [
  {
    href: "/docs/claude-code",
    image: "/images/claude-code-screenshot.png",
    alt: "Claude Code",
    titleKey: "INTEGRATION_CLAUDE_CODE_TITLE",
    descKey: "INTEGRATION_CLAUDE_CODE_DESCRIPTION",
    color: "orange",
  },
  {
    href: "/docs/codex",
    image: "/images/codex-screenshot.png",
    alt: "Codex CLI",
    titleKey: "INTEGRATION_CODEX_TITLE",
    descKey: "INTEGRATION_CODEX_DESCRIPTION",
    color: "emerald",
  },
  {
    href: "/docs/gemini-cli",
    image: "/images/gemini-cli-screenshot.png",
    alt: "Gemini CLI",
    titleKey: "INTEGRATION_GEMINI_CLI_TITLE",
    descKey: "INTEGRATION_GEMINI_CLI_DESCRIPTION",
    color: "blue",
  },
  {
    href: "/docs/openclaw",
    image: "/images/openclaw-screenshot.png",
    alt: "OpenClaw",
    titleKey: "INTEGRATION_OPENCLAW_TITLE",
    descKey: "INTEGRATION_OPENCLAW_DESCRIPTION",
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
  const t = await getTranslations("HOME");

  return (
    <section className="relative py-8 px-6 border-t border-b border-white/5 bg-linear-to-r from-orange-600/5 via-transparent to-red-600/5">
      <div className="max-w-360 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {integrations.map((integration) => {
            const colors = colorMap[integration.color];
            return (
              <Link
                key={integration.href}
                href={integration.href}
                className={`group flex flex-col gap-4 py-4 px-6 rounded-lg border ${colors.border} bg-black/40 backdrop-blur-sm ${colors.hoverBg} transition-all duration-300`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div
                      className={`absolute inset-0 ${colors.glow} blur-xl rounded-full`}
                    />
                    <Image
                      src={integration.image}
                      alt={integration.alt}
                      width={80}
                      height={48}
                      className="relative rounded w-20 h-auto"
                    />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${colors.badge} rounded`}
                      >
                        {t("INTEGRATION_BADGE")}
                      </span>
                    </div>
                    <h3 className="text-base md:text-lg font-bold text-white tracking-tight leading-tight">
                      {t(integration.titleKey)}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-gray-400 font-mono leading-relaxed">
                  {t(integration.descKey)}
                </p>
                <div className="flex items-center gap-3 mt-auto pt-2">
                  <span className="text-sm font-mono text-white/70 group-hover:text-white transition-colors">
                    {t("INTEGRATION_VIEW_GUIDE")}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full border ${colors.ring} flex items-center justify-center transition-all`}
                  >
                    <LuArrowRight
                      className={`h-3.5 w-3.5 ${colors.arrow} group-hover:text-white transition-colors`}
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
