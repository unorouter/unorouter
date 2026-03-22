import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/config/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GetStartedButton } from "@/components/elements/get-started-link";
import { CodeBlock } from "@/components/elements/code-block";
import { Callout } from "@/components/elements/callout";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { Link } from "@/i18n/navigation";

const toc = createTOC([
  { title: "Quick Start", url: "#quick-start", depth: 2 },
  { title: "Features", url: "#features", depth: 2 },
  { title: "Installation", url: "#installation", depth: 2 },
  { title: "macOS / Linux", url: "#macos-linux", depth: 3 },
  { title: "Windows", url: "#windows", depth: 3 },
  { title: "Configuration", url: "#configuration", depth: 2 },
  { title: "Usage", url: "#usage", depth: 2 },
]);

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("DOCS.GEMINI_CLI.META.TITLE", APP_VALUES),
    description: t("DOCS.GEMINI_CLI.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.GEMINI_CLI.META.KEYWORDS", APP_VALUES),
  });
}

export default async function GeminiCliPage() {
  const t = await getTranslations();

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {t("DOCS.GEMINI_CLI.BADGE")}
          </Badge>
        </div>

        <h1 className="mt-4 text-4xl font-bold">
          {t("DOCS.GEMINI_CLI.TITLE")}
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
          {t("DOCS.GEMINI_CLI.SUBTITLE", APP_VALUES)}
        </p>

        {/* Project Intro */}
        <Callout type="info" title={t("DOCS.GEMINI_CLI.INTRO_TITLE")}>
          <p>{t("DOCS.GEMINI_CLI.INTRO_DESC")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              <a
                href="https://github.com/google-gemini/gemini-cli"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                GitHub
              </a>
            </li>
          </ul>
        </Callout>

        {/* Quick Start */}
        <section className="mt-12" id="quick-start">
          <h2 className="mb-4 text-2xl font-semibold">
            {t("DOCS.GEMINI_CLI.QUICK_START")}
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">
            {t("DOCS.GEMINI_CLI.QUICK_START_DESC", APP_VALUES)}
          </p>
          <CodeBlock
            language="bash"
            code={`# Environment variables for Gemini CLI
export GEMINI_API_BASE="${process.env.NEXT_PUBLIC_API_URL}"
export GEMINI_API_KEY="YOUR_API_KEY"

# Then run Gemini CLI
gemini`}
          />
        </section>

        {/* Features */}
        <section className="mt-12" id="features">
          <h2 className="mb-4 text-2xl font-semibold">
            {t("DOCS.GEMINI_CLI.FEATURES")}
          </h2>
          <ul className="text-muted-foreground space-y-3 text-sm">
            <li>
              <strong>{t("DOCS.GEMINI_CLI.FEATURE_AGENTIC")}</strong>
              {" \u2014 "}
              {t("DOCS.GEMINI_CLI.FEATURE_AGENTIC_DESC")}
            </li>
            <li>
              <strong>{t("DOCS.GEMINI_CLI.FEATURE_MULTIMODAL")}</strong>
              {" \u2014 "}
              {t("DOCS.GEMINI_CLI.FEATURE_MULTIMODAL_DESC")}
            </li>
            <li>
              <strong>{t("DOCS.GEMINI_CLI.FEATURE_MCP")}</strong>
              {" \u2014 "}
              {t("DOCS.GEMINI_CLI.FEATURE_MCP_DESC")}
            </li>
            <li>
              <strong>{t("DOCS.GEMINI_CLI.FEATURE_CUSTOMIZABLE")}</strong>
              {" \u2014 "}
              {t("DOCS.GEMINI_CLI.FEATURE_CUSTOMIZABLE_DESC")}
            </li>
          </ul>
        </section>

        {/* Installation */}
        <section className="mt-12" id="installation">
          <h2 className="mb-4 text-2xl font-semibold">
            {t("DOCS.GEMINI_CLI.INSTALLATION")}
          </h2>

          <h3 className="mb-3 text-lg font-medium" id="macos-linux">
            {t("DOCS.GEMINI_CLI.INSTALL_MACOS_LINUX")}
          </h3>
          <CodeBlock
            language="bash"
            code={`npm install -g @google/gemini-cli`}
          />

          <h3 className="mt-6 mb-3 text-lg font-medium" id="windows">
            {t("DOCS.GEMINI_CLI.INSTALL_WINDOWS")}
          </h3>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.GEMINI_CLI.INSTALL_WINDOWS_DESC")}
          </p>
          <CodeBlock
            language="bash"
            code={`npm install -g @google/gemini-cli`}
          />
        </section>

        {/* Configuration */}
        <section className="mt-12" id="configuration">
          <h2 className="mb-4 text-2xl font-semibold">
            {t("DOCS.GEMINI_CLI.CONFIGURATION")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.GEMINI_CLI.CONFIGURATION_DESC", APP_VALUES)}
          </p>
          <CodeBlock
            language="bash"
            code={`export GEMINI_API_BASE="${process.env.NEXT_PUBLIC_API_URL}"
export GEMINI_API_KEY="YOUR_API_KEY"`}
          />
        </section>

        {/* Usage */}
        <section className="mt-12" id="usage">
          <h2 className="mb-4 text-2xl font-semibold">
            {t("DOCS.GEMINI_CLI.USAGE")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.GEMINI_CLI.USAGE_DESC")}
          </p>
          <CodeBlock
            language="bash"
            code={`# Start Gemini CLI
gemini

# Switch models within the session
/model gemini-2.5-pro`}
          />
        </section>

        {/* CTA */}
        <section className="border-border mt-16 border-t pt-12 text-center">
          <h2 className="text-2xl font-semibold">
            {t("DOCS.GEMINI_CLI.CTA_TITLE")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t("DOCS.GEMINI_CLI.CTA_DESC", APP_VALUES)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <GetStartedButton translationKey="DOCS.GEMINI_CLI.CTA_SIGNUP" />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/models" />}
            >
              {t("DOCS.GEMINI_CLI.CTA_MODELS")}
            </Button>
          </div>
        </section>
      </div>
    </TOCLayout>
  );
}
