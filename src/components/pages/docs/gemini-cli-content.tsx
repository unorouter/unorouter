import { ApiKeyCodeBlock } from "@/components/elements/api-key-code-block";
import { Callout } from "@/components/elements/callout";
import { CodeBlock } from "@/components/elements/code-block";
import { GetStartedButton } from "@/components/elements/get-started-link";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { PageHeader } from "@/components/elements/page-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getDocsApiKey } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import Gemini from "@lobehub/icons/es/Gemini";
import { CCSwitchSetup } from "./cc-switch-setup";

export async function GeminiCliContent() {
  const t = await getTranslations();
  const docs = await getDocsApiKey();

  const toc = createTOC(
    [
      {
        title: t("DOCS.GEMINI_CLI.TOC_QUICK_START"),
        url: "#quick-start",
        depth: 2,
      },
      { title: t("DOCS.GEMINI_CLI.TOC_FEATURES"), url: "#features", depth: 2 },
      {
        title: t("DOCS.CC_SWITCH_SETUP_TITLE"),
        url: "#cc-switch-setup",
        depth: 2,
      },
      {
        title: t("DOCS.GEMINI_CLI.TOC_INSTALLATION"),
        url: "#installation",
        depth: 2,
      },
      {
        title: t("DOCS.GEMINI_CLI.TOC_MACOS_LINUX"),
        url: "#macos-linux",
        depth: 3,
      },
      { title: t("DOCS.GEMINI_CLI.TOC_WINDOWS"), url: "#windows", depth: 3 },
      {
        title: t("DOCS.GEMINI_CLI.TOC_CONFIGURATION"),
        url: "#configuration",
        depth: 2,
      },
      { title: t("DOCS.GEMINI_CLI.TOC_USAGE"), url: "#usage", depth: 2 },
    ],
    t("DOCS.TOC_TITLE"),
  );

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <PageHeader
          badge={t("DOCS.GEMINI_CLI.BADGE")}
          badgeIcon={Gemini}
          title={t("DOCS.GEMINI_CLI.TITLE")}
          subtitle={t("DOCS.GEMINI_CLI.SUBTITLE", APP_VALUES)}
          centered
        />

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
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="quick-start">
            {t("DOCS.GEMINI_CLI.QUICK_START")}
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">
            {t("DOCS.GEMINI_CLI.QUICK_START_DESC", APP_VALUES)}
          </p>
          {(() => {
            const quickStartCode = `# Create ~/.gemini/.env with your config
mkdir -p ~/.gemini
cat > ~/.gemini/.env << 'EOF'
GEMINI_API_KEY=${docs.displayKey}
GOOGLE_GEMINI_BASE_URL=${process.env.NEXT_PUBLIC_API_URL}
EOF

# Then run Gemini CLI
gemini`;
            return (
              <ApiKeyCodeBlock code={quickStartCode} placeholder={docs.placeholder} apiKey={docs.rawApiKey} initialRevealed={docs.isRevealed}>
                <CodeBlock language="bash" code={quickStartCode} />
              </ApiKeyCodeBlock>
            );
          })()}
        </section>

        {/* Features */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="features">
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

        {/* CC Switch Quick Setup */}
        <CCSwitchSetup
          app="gemini"
          endpoint={process.env.NEXT_PUBLIC_API_URL!}
          cliCodeBlock={
            <CodeBlock
              language="bash"
              code="cc-switch provider add"
            />
          }
        />

        {/* Installation */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="installation">
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
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="configuration">
            {t("DOCS.GEMINI_CLI.CONFIGURATION")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.GEMINI_CLI.CONFIGURATION_DESC", APP_VALUES)}
          </p>

          {/* Config file (recommended) */}
          <h3 className="mb-2 text-lg font-medium">
            {t("DOCS.CONFIG_FILE_LABEL")}
          </h3>
          <p className="text-muted-foreground mb-3 text-sm">
            {t("DOCS.CONFIG_FILE_DESC")}
          </p>
          {(() => {
            const configCode = `GEMINI_API_KEY=${docs.displayKey}
GOOGLE_GEMINI_BASE_URL=${process.env.NEXT_PUBLIC_API_URL}`;
            return (
              <ApiKeyCodeBlock code={configCode} placeholder={docs.placeholder} apiKey={docs.rawApiKey} initialRevealed={docs.isRevealed}>
                <p className="text-muted-foreground mb-1 font-mono text-xs">
                  ~/.gemini/.env
                </p>
                <CodeBlock language="bash" code={configCode} />
              </ApiKeyCodeBlock>
            );
          })()}

          {/* Env vars (alternative) */}
          <h3 className="mt-8 mb-2 text-lg font-medium">
            {t("DOCS.CONFIG_ENV_LABEL")}
          </h3>
          <p className="text-muted-foreground mb-3 text-sm">
            {t("DOCS.CONFIG_ENV_DESC")}
          </p>
          {(() => {
            const envCode = `export GEMINI_API_BASE="${process.env.NEXT_PUBLIC_API_URL}"
export GEMINI_API_KEY="${docs.displayKey}"`;
            return (
              <ApiKeyCodeBlock code={envCode} placeholder={docs.placeholder} apiKey={docs.rawApiKey} initialRevealed={docs.isRevealed}>
                <CodeBlock language="bash" code={envCode} />
              </ApiKeyCodeBlock>
            );
          })()}
        </section>

        {/* Usage */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="usage">
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
