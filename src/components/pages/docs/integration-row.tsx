import { ApiKeyCodeBlock } from "@/components/elements/code/api-key-code-block";
import {
  CodeBlock,
  highlightCode,
} from "@/components/elements/code/code-block";
import { OSCodeBlock } from "@/components/pages/docs/os/os-code-block";
import { buildOSVariants } from "@/components/pages/docs/os/os-code-helpers";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { OS, OS_VALUES } from "@/lib/types/enums";
import { getTranslations } from "next-intl/server";
import { GuideIcon } from "./guide-icon";
import { type Integration } from "./integrations";
import { OSQuickStart } from "./os-quick-start";

export async function IntegrationRow(props: {
  integration: Integration;
  id?: string;
}) {
  const t = await getTranslations();

  const integration = props.integration;
  const hasApiKey =
    integration.kind === "cli"
      ? Object.values(integration.quickStart).some((code) =>
          code.includes("YOUR_API_KEY"),
        )
      : integration.quickConfig.includes("YOUR_API_KEY");

  return (
    <div
      className={`relative rounded-lg border ${integration.color.border} bg-card/40 overflow-hidden backdrop-blur-sm`}
    >
      <div className={`h-0.5 ${integration.color.line}`} />

      <div className="p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-4 md:flex-row md:items-center md:gap-5">
            <div className="relative shrink-0">
              <div
                className={`absolute inset-0 ${integration.color.glow} rounded-full blur-xl`}
              />
              <GuideIcon
                iconKey={integration.iconKey}
                logoSrc={integration.logoSrc}
                logoBg={integration.logoBg}
                logoMono={integration.logoMono}
                accentClass={integration.color.accent}
                size={48}
              />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase ${integration.color.badge} rounded`}
                >
                  {t(integration.badgeKey, APP_VALUES)}
                </span>
              </div>
              <h2
                id={props.id}
                className={`text-xl font-bold tracking-tight md:text-2xl ${integration.color.accent}`}
              >
                {t(integration.titleKey, APP_VALUES)}
              </h2>
              <p className="text-muted-foreground mt-1 font-mono text-sm leading-relaxed">
                {t(integration.subtitleKey, APP_VALUES)}
              </p>
            </div>
          </div>

          <Link
            href={integration.href}
            className="group flex shrink-0 items-center gap-3"
          >
            <span className="text-foreground/70 group-hover:text-foreground font-mono text-sm transition-colors">
              {t("DOCS_INDEX.VIEW_GUIDE")}
            </span>
            <div
              className={`h-10 w-10 rounded-full border ${integration.color.ring} flex items-center justify-center transition-all`}
            >
              <Icon
                name="arrow-right"
                className={`h-4 w-4 ${integration.color.arrow} transition-colors`}
              />
            </div>
          </Link>
        </div>

        <div className="mt-6">
          <p className="text-muted-foreground mb-3 font-mono text-xs tracking-wider uppercase">
            {t("DOCS_INDEX.QUICK_START")}
          </p>
          {integration.kind === "rp" ? (
            <ApiKeyCodeBlock
              html={await highlightCode(integration.quickConfig, "text")}
              code={integration.quickConfig}
              language="text"
              placeholder="YOUR_API_KEY"
            />
          ) : hasApiKey ? (
            <OSCodeBlock
              placeholder="YOUR_API_KEY"
              variants={await buildOSVariants({
                windows: {
                  code: integration.quickStart.windows,
                  language: "powershell",
                },
                macos: {
                  code: integration.quickStart.macos,
                  language: "bash",
                },
                linux: {
                  code: integration.quickStart.linux,
                  language: "bash",
                },
              })}
            />
          ) : (
            <OSQuickStart
              variants={
                Object.fromEntries(
                  OS_VALUES.map((os) => [
                    os,
                    <CodeBlock
                      key={os}
                      language={os === OS.WINDOWS ? "powershell" : "bash"}
                      code={integration.quickStart[os]}
                    />,
                  ]),
                ) as Record<OS, React.ReactNode>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
