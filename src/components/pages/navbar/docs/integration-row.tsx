import { CodeBlock } from "@/components/elements/code/code-block";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import Claude from "@lobehub/icons/es/Claude";
import Codex from "@lobehub/icons/es/Codex";
import Gemini from "@lobehub/icons/es/Gemini";
import { getTranslations } from "next-intl/server";
import type { ComponentType } from "react";
import { GiCrabClaw } from "react-icons/gi";
import { LuArrowLeftRight, LuArrowRight } from "react-icons/lu";
import { type Integration, type IntegrationIconKey } from "./integrations";

const iconMap: Record<
  IntegrationIconKey,
  ComponentType<{ className?: string; size?: number }>
> = {
  "cc-switch": LuArrowLeftRight,
  "claude-code": Claude.Color,
  codex: Codex.Color,
  gemini: Gemini.Color,
  openclaw: GiCrabClaw,
};

export async function IntegrationRow(props: {
  integration: Integration;
  id?: string;
}) {
  const t = await getTranslations();

  const Icon = iconMap[props.integration.iconKey];

  return (
    <div
      className={`relative rounded-lg border ${props.integration.color.border} bg-card/40 overflow-hidden backdrop-blur-sm`}
    >
      <div className={`h-0.5 ${props.integration.color.line}`} />

      <div className="p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div className="relative shrink-0">
              <div
                className={`absolute inset-0 ${props.integration.color.glow} rounded-full blur-xl`}
              />
              <Icon size={48} className={`relative ${props.integration.color.accent}`} />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase ${props.integration.color.badge} rounded`}
                >
                  {t(props.integration.badgeKey)}
                </span>
              </div>
              <h2
                id={props.id}
                className={`text-xl font-bold tracking-tight md:text-2xl ${props.integration.color.accent}`}
              >
                {t(props.integration.titleKey)}
              </h2>
              <p className="text-muted-foreground mt-1 font-mono text-sm leading-relaxed">
                {t(props.integration.subtitleKey, APP_VALUES)}
              </p>
            </div>
          </div>

          <Link
            href={props.integration.href}
            className="group flex shrink-0 items-center gap-3"
          >
            <span className="text-foreground/70 group-hover:text-foreground font-mono text-sm transition-colors">
              {t("DOCS_INDEX.VIEW_GUIDE")}
            </span>
            <div
              className={`h-10 w-10 rounded-full border ${props.integration.color.ring} flex items-center justify-center transition-all`}
            >
              <LuArrowRight
                className={`h-4 w-4 ${props.integration.color.arrow} transition-colors`}
              />
            </div>
          </Link>
        </div>

        <div className="mt-6">
          <p className="text-muted-foreground mb-3 font-mono text-xs tracking-wider uppercase">
            {t("DOCS_INDEX.QUICK_START")}
          </p>
          <CodeBlock language="bash" code={props.integration.quickStart} />
        </div>
      </div>
    </div>
  );
}
