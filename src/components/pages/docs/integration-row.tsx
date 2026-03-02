import { CodeBlock } from "@/components/elements/code-block";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { LuArrowRight } from "react-icons/lu";
import { type Integration } from "./integrations";

export async function IntegrationRow(props: { integration: Integration }) {
  const t = await getTranslations();

  return (
    <div
      className={`relative rounded-lg border ${props.integration.color.border} bg-card/40 backdrop-blur-sm overflow-hidden`}
    >
      {/* Colored top line */}
      <div className={`h-0.5 ${props.integration.color.line}`} />

      <div className="p-6 md:p-8">
        {/* Header row: image + info + arrow link */}
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`absolute inset-0 ${props.integration.color.glow} blur-xl rounded-full`}
              />
              <Image
                src={props.integration.image}
                alt={props.integration.alt}
                width={80}
                height={48}
                className="relative rounded w-20 h-auto"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${props.integration.color.badge} rounded`}
                >
                  {t(props.integration.badgeKey)}
                </span>
              </div>
              <h2
                className={`text-xl md:text-2xl font-bold tracking-tight ${props.integration.color.accent}`}
              >
                {t(props.integration.titleKey)}
              </h2>
              <p className="text-sm text-muted-foreground font-mono mt-1 leading-relaxed">
                {t(props.integration.subtitleKey)}
              </p>
            </div>
          </div>

          <Link
            href={props.integration.href}
            className="group shrink-0 flex items-center gap-3"
          >
            <span className="text-sm font-mono text-foreground/70 group-hover:text-foreground transition-colors">
              {t("DOCS_INDEX.VIEW_GUIDE")}
            </span>
            <div
              className={`w-10 h-10 rounded-full border ${props.integration.color.ring} flex items-center justify-center transition-all`}
            >
              <LuArrowRight
                className={`h-4 w-4 ${props.integration.color.arrow} transition-colors`}
              />
            </div>
          </Link>
        </div>

        {/* Quick start code block */}
        <div className="mt-6">
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
            {t("DOCS_INDEX.QUICK_START")}
          </p>
          <CodeBlock language="bash" code={props.integration.quickStart} />
        </div>
      </div>
    </div>
  );
}
