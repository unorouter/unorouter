import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/elements/code-block";
import Image from "next/image";
import { LuArrowRight } from "react-icons/lu";

const integrations = [
  {
    href: "/docs/claude-code",
    image: "/images/claude-code-screenshot.png",
    alt: "Claude Code",
    namespace: "DOCS.CLAUDE_CODE",
    color: {
      accent: "text-orange-500",
      badge: "bg-orange-600/20 text-orange-500",
      border: "border-orange-600/20",
      glow: "bg-orange-600/20",
      bg: "bg-orange-600/5",
      ring: "border-orange-600/30 hover:bg-orange-600 hover:border-orange-600",
      arrow: "text-orange-500 group-hover:text-white",
      line: "bg-orange-600/40",
    },
    quickStart: `export ANTHROPIC_BASE_URL="https://api.unorouter.ai"
export ANTHROPIC_API_KEY="YOUR_UNOROUTER_API_KEY"

claude`,
  },
  {
    href: "/docs/codex",
    image: "/images/codex-screenshot.png",
    alt: "Codex CLI",
    namespace: "DOCS.CODEX",
    color: {
      accent: "text-emerald-500",
      badge: "bg-emerald-600/20 text-emerald-500",
      border: "border-emerald-600/20",
      glow: "bg-emerald-600/20",
      bg: "bg-emerald-600/5",
      ring: "border-emerald-600/30 hover:bg-emerald-600 hover:border-emerald-600",
      arrow: "text-emerald-500 group-hover:text-white",
      line: "bg-emerald-600/40",
    },
    quickStart: `export OPENAI_BASE_URL="https://api.unorouter.ai/v1"
export OPENAI_API_KEY="YOUR_UNOROUTER_API_KEY"

codex`,
  },
  {
    href: "/docs/gemini-cli",
    image: "/images/gemini-cli-screenshot.png",
    alt: "Gemini CLI",
    namespace: "DOCS.GEMINI_CLI",
    color: {
      accent: "text-blue-500",
      badge: "bg-blue-600/20 text-blue-500",
      border: "border-blue-600/20",
      glow: "bg-blue-600/20",
      bg: "bg-blue-600/5",
      ring: "border-blue-600/30 hover:bg-blue-600 hover:border-blue-600",
      arrow: "text-blue-500 group-hover:text-white",
      line: "bg-blue-600/40",
    },
    quickStart: `export GEMINI_API_BASE="https://api.unorouter.ai"
export GEMINI_API_KEY="YOUR_UNOROUTER_API_KEY"

gemini`,
  },
  {
    href: "/docs/openclaw",
    image: "/images/openclaw-screenshot.png",
    alt: "OpenClaw",
    namespace: "DOCS.OPENCLAW",
    color: {
      accent: "text-red-500",
      badge: "bg-red-600/20 text-red-500",
      border: "border-red-600/20",
      glow: "bg-red-600/20",
      bg: "bg-red-600/5",
      ring: "border-red-600/30 hover:bg-red-600 hover:border-red-600",
      arrow: "text-red-500 group-hover:text-white",
      line: "bg-red-600/40",
    },
    quickStart: `# In ~/.openclaw/config.yaml
# providers.openai.baseUrl: "https://api.unorouter.ai/v1"
export OPENAI_API_KEY="YOUR_UNOROUTER_API_KEY"

openclaw onboard`,
  },
] as const;

export default async function DocsPage() {
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          {t("DOCS_INDEX.TITLE")}
        </h1>
        <p className="text-muted-foreground mt-4 text-lg font-mono max-w-2xl mx-auto">
          {t("DOCS_INDEX.SUBTITLE")}
        </p>
      </div>

      <div className="space-y-6">
        {integrations.map((integration) => (
          <IntegrationRow
            key={integration.href}
            integration={integration}
          />
        ))}
      </div>

      {/* CTA */}
      <section className="mt-20 border-t border-white/10 pt-12 text-center">
        <h2 className="text-2xl font-semibold">
          {t("DOCS_INDEX.CTA_TITLE")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("DOCS_INDEX.CTA_DESC")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button render={<a href="https://api.unorouter.ai/register" />}>
            {t("DOCS_INDEX.CTA_SIGNUP")}
          </Button>
          <Button variant="outline" render={<Link href="/models" />}>
            {t("DOCS_INDEX.CTA_MODELS")}
          </Button>
        </div>
      </section>
    </div>
  );
}

async function IntegrationRow({
  integration,
}: {
  integration: (typeof integrations)[number];
}) {
  const t = await getTranslations();
  const dt = await getTranslations(integration.namespace);

  return (
    <div
      className={`relative rounded-lg border ${integration.color.border} bg-black/40 backdrop-blur-sm overflow-hidden`}
    >
      {/* Colored top line */}
      <div className={`h-0.5 ${integration.color.line}`} />

      <div className="p-6 md:p-8">
        {/* Header row: image + info + arrow link */}
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div
                className={`absolute inset-0 ${integration.color.glow} blur-xl rounded-full`}
              />
              <Image
                src={integration.image}
                alt={integration.alt}
                width={80}
                height={48}
                className="relative rounded"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${integration.color.badge} rounded`}
                >
                  {dt("BADGE")}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-white/10 text-white/60 rounded">
                  {dt("API_BADGE")}
                </span>
              </div>
              <h2
                className={`text-xl md:text-2xl font-bold tracking-tight ${integration.color.accent}`}
              >
                {dt("TITLE")}
              </h2>
              <p className="text-sm text-gray-400 font-mono mt-1 leading-relaxed">
                {dt("SUBTITLE")}
              </p>
            </div>
          </div>

          <Link
            href={integration.href}
            className="group shrink-0 flex items-center gap-3"
          >
            <span className="text-sm font-mono text-white/70 group-hover:text-white transition-colors">
              {t("DOCS_INDEX.VIEW_GUIDE")}
            </span>
            <div
              className={`w-10 h-10 rounded-full border ${integration.color.ring} flex items-center justify-center transition-all`}
            >
              <LuArrowRight
                className={`h-4 w-4 ${integration.color.arrow} transition-colors`}
              />
            </div>
          </Link>
        </div>

        {/* Quick start code block */}
        <div className="mt-6">
          <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-3">
            {t("DOCS_INDEX.QUICK_START")}
          </p>
          <CodeBlock language="bash" code={integration.quickStart} />
        </div>
      </div>
    </div>
  );
}
