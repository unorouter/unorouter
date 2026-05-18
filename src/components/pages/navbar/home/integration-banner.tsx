import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/ui/icon";
import {
  CLI_INTEGRATIONS,
  RP_INTEGRATIONS,
  type IntegrationEntry,
} from "@/components/pages/navbar/home/integrations";
import { APP_VALUES, msg, type TranslationKey } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

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
  fuchsia: {
    glow: "bg-fuchsia-600/20",
    badge: "bg-fuchsia-600/20 text-fuchsia-400",
    border: "border-fuchsia-600/20 hover:border-fuchsia-600/50",
    hoverBg: "hover:bg-fuchsia-600/5",
    ring: "border-fuchsia-600/30 group-hover:bg-fuchsia-600 group-hover:border-fuchsia-600",
    arrow: "text-fuchsia-400",
  },
  cyan: {
    glow: "bg-cyan-500/20",
    badge: "bg-cyan-500/20 text-cyan-400",
    border: "border-cyan-500/20 hover:border-cyan-500/50",
    hoverBg: "hover:bg-cyan-500/5",
    ring: "border-cyan-500/30 group-hover:bg-cyan-500 group-hover:border-cyan-500",
    arrow: "text-cyan-400",
  },
  yellow: {
    glow: "bg-yellow-500/20",
    badge: "bg-yellow-500/20 text-yellow-400",
    border: "border-yellow-500/20 hover:border-yellow-500/50",
    hoverBg: "hover:bg-yellow-500/5",
    ring: "border-yellow-500/30 group-hover:bg-yellow-500 group-hover:border-yellow-500",
    arrow: "text-yellow-400",
  },
  purple: {
    glow: "bg-purple-600/20",
    badge: "bg-purple-600/20 text-purple-400",
    border: "border-purple-600/20 hover:border-purple-600/50",
    hoverBg: "hover:bg-purple-600/5",
    ring: "border-purple-600/30 group-hover:bg-purple-600 group-hover:border-purple-600",
    arrow: "text-purple-400",
  },
} as const;

async function IntegrationRow(props: {
  items: readonly IntegrationEntry[];
  tintClassName: string;
  headerKey?: TranslationKey;
  headerAccent?: string;
}) {
  const t = await getTranslations();

  return (
    <section
      className={`border-border/50 relative border-t border-b py-8 ${props.tintClassName}`}
    >
      <div className="mx-auto max-w-360 px-6">
        {props.headerKey && (
          <div className="mb-5 flex items-center gap-3">
            <div
              className={`h-px flex-1 bg-linear-to-r from-transparent ${props.headerAccent ?? "via-foreground/20"} to-transparent`}
            />
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.3em] uppercase">
              {t(props.headerKey)}
            </span>
            <div
              className={`h-px flex-1 bg-linear-to-r from-transparent ${props.headerAccent ?? "via-foreground/20"} to-transparent`}
            />
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {props.items.map((integration) => {
            const colors = colorMap[integration.color];
            return (
              <Link
                key={integration.badge}
                href={integration.href}
                className={`group flex flex-col gap-4 rounded-lg border px-6 py-4 ${colors.border} bg-card/40 backdrop-blur-sm ${colors.hoverBg} transition-all duration-300`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div
                      className={`absolute inset-0 ${colors.glow} rounded-full blur-xl`}
                    />
                    {integration.logoSrc ? (
                      integration.logoBg ? (
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-md bg-white p-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={integration.logoSrc}
                            alt={integration.badge}
                            width={32}
                            height={32}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={integration.logoSrc}
                          alt={integration.badge}
                          width={40}
                          height={40}
                          className="relative h-10 w-10 object-contain"
                        />
                      )
                    ) : integration.icon ? (
                      <integration.icon size={40} className="relative" />
                    ) : null}
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
                    <Icon
                      name="arrow-right"
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

/** CLI tools row. Warm orange/red tint to match existing palette. */
export function IntegrationBannerCli() {
  return (
    <IntegrationRow
      items={CLI_INTEGRATIONS}
      tintClassName="bg-linear-to-r from-orange-600/5 via-transparent to-red-600/5"
      headerKey={msg("HOME.INTEGRATION.CLI_HEADER")}
      headerAccent="via-orange-500/30"
    />
  );
}

/** Roleplay clients row. Cool fuchsia/purple tint, distinct from the CLI row. */
export function IntegrationBannerRoleplay() {
  return (
    <IntegrationRow
      items={RP_INTEGRATIONS}
      tintClassName="bg-linear-to-r from-fuchsia-600/5 via-transparent to-purple-600/5"
      headerKey={msg("HOME.INTEGRATION.RP_HEADER")}
      headerAccent="via-fuchsia-500/30"
    />
  );
}

/** Combined stacked banner (CLI row followed by Roleplay row). Used on the pricing page. */
export function IntegrationBanner() {
  return (
    <>
      <IntegrationBannerCli />
      <IntegrationBannerRoleplay />
    </>
  );
}
