import { CodeBlock } from "@/components/elements/code-block";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { LuArrowRight } from "react-icons/lu";
import { type Integration } from "./integrations";

export async function IntegrationRow(props: {
  integration: Integration;
  id?: string;
}) {
  const t = await getTranslations();

  return (
    <div
      id={props.id}
      className={`relative rounded-lg border ${props.integration.color.border} bg-card/40 overflow-hidden backdrop-blur-sm`}
    >
      {/* Colored top line */}
      <div className={`h-0.5 ${props.integration.color.line}`} />

      <div className="p-6 md:p-8">
        {/* Header row: image + info + arrow link */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div className="relative shrink-0">
              <div
                className={`absolute inset-0 ${props.integration.color.glow} rounded-full blur-xl`}
              />
              <Image
                src={props.integration.image}
                alt={props.integration.alt}
                width={80}
                height={48}
                className="relative w-20 rounded"
                style={{ width: "auto", height: "auto" }}
              />
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

        {/* Quick start code block */}
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
