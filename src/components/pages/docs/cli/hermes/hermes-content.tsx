import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { PageHeader } from "@/components/elements/content/page-header";
import { Button } from "@/components/ui/button";
import { GetStartedButton } from "@/components/elements/brand/get-started-link";
import { CodeBlock } from "@/components/elements/code/code-block";
import { Callout } from "@/components/elements/content/callout";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { Link } from "@/i18n/navigation";
import { getDocsApiKey } from "@/lib/utils/server";
import HermesAgent from "@lobehub/icons/es/HermesAgent";
import { getTranslations } from "next-intl/server";
import { OSCodeBlock } from "../../os/os-code-block";
import { buildOSVariants } from "../../os/os-code-helpers";

export async function HermesContent() {
  const t = await getTranslations();
  const docs = await getDocsApiKey();

  const toc = createTOC(
    [
      {
        title: t("DOCS.HERMES.TOC_CORE_FEATURES"),
        url: "#core-features",
        depth: 2,
      },
      {
        title: t("DOCS.HERMES.TOC_INSTALLATION"),
        url: "#installation",
        depth: 2,
      },
      {
        title: t("DOCS.HERMES.TOC_CONFIGURATION"),
        url: "#configuration",
        depth: 2,
      },
      {
        title: t("DOCS.HERMES.TOC_KEY_CONFIG"),
        url: "#key-configuration-details",
        depth: 3,
      },
      {
        title: t("DOCS.HERMES.TOC_CLI_ALT"),
        url: "#cli-alternative",
        depth: 3,
      },
      {
        title: t("DOCS.HERMES.TOC_RUN"),
        url: "#run-hermes",
        depth: 3,
      },
    ],
    t("DOCS.TOC_TITLE"),
  );

  // Hermes routes every chat turn through model.base_url when model.provider is
  // "custom" (base_url takes precedence over the named provider). The API key
  // lives in ~/.hermes/.env as OPENAI_API_KEY (the fallback auth env var).
  const hermesConfigCode = `model:
  provider: "custom"
  base_url: "${env.apiUrl}/v1"
  default: "${docs.topTextModel}"`;

  const hermesEnvCode = `OPENAI_API_KEY=${docs.placeholder}`;

  const configVariants = await buildOSVariants({
    windows: {
      code: hermesConfigCode,
      language: "yaml",
      label: "~/.hermes/config.yaml",
    },
    macos: {
      code: hermesConfigCode,
      language: "yaml",
      label: "~/.hermes/config.yaml",
    },
    linux: {
      code: hermesConfigCode,
      language: "yaml",
      label: "~/.hermes/config.yaml",
    },
  });

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <PageHeader
          badge={t("DOCS.HERMES.BADGE")}
          badgeIconComponent={HermesAgent}
          title={t("DOCS.HERMES.TITLE")}
          subtitle={t("DOCS.HERMES.SUBTITLE", APP_VALUES)}
          centered
        />

        {/* Project Intro */}
        <Callout type="info" title={t("DOCS.HERMES.INTRO_TITLE")}>
          <p>{t("DOCS.HERMES.INTRO_DESC")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              <a
                href="https://hermes-agent.nousresearch.com/docs/"
                target="_blank"
                className="text-primary underline"
              >
                hermes-agent.nousresearch.com
              </a>
            </li>
            <li>
              <a
                href="https://github.com/NousResearch/hermes-agent"
                target="_blank"
                className="text-primary underline"
              >
                GitHub
              </a>
            </li>
          </ul>
        </Callout>

        {/* Core Features */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="core-features">
            {t("DOCS.HERMES.CORE_FEATURES")}
          </h2>
          <ul className="text-muted-foreground space-y-3 text-sm">
            <li>
              <strong>{t("DOCS.HERMES.FEATURE_SELF_IMPROVING")}</strong>
              {" - "}
              {t("DOCS.HERMES.FEATURE_SELF_IMPROVING_DESC")}
            </li>
            <li>
              <strong>{t("DOCS.HERMES.FEATURE_OPENAI_COMPAT")}</strong>
              {" - "}
              {t("DOCS.HERMES.FEATURE_OPENAI_COMPAT_DESC", APP_VALUES)}
            </li>
            <li>
              <strong>{t("DOCS.HERMES.FEATURE_INTERFACES")}</strong>
              {" - "}
              {t("DOCS.HERMES.FEATURE_INTERFACES_DESC")}
            </li>
            <li>
              <strong>{t("DOCS.HERMES.FEATURE_GATEWAY")}</strong>
              {" - "}
              {t("DOCS.HERMES.FEATURE_GATEWAY_DESC")}
            </li>
          </ul>
        </section>

        {/* Installation */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="installation">
            {t("DOCS.HERMES.INSTALLATION")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.HERMES.INSTALLATION_PREREQ")}
          </p>
          <CodeBlock
            language="bash"
            code={`# Install script (recommended)
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

# Or via PyPI
pip install hermes-agent
hermes postinstall`}
          />
          <Callout
            type="warn"
            title={t("DOCS.HERMES.WINDOWS_NOTE_TITLE")}
            className="mt-4"
          >
            <p>{t("DOCS.HERMES.WINDOWS_NOTE_DESC")}</p>
          </Callout>
        </section>

        {/* Configuration */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="configuration">
            {t("DOCS.HERMES.CONFIGURATION")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.HERMES.CONFIG_LOCATION", APP_VALUES)}
          </p>
          <OSCodeBlock variants={configVariants} placeholder={docs.placeholder} />

          <p className="text-muted-foreground mt-4 mb-3 text-sm">
            {t("DOCS.HERMES.CONFIG_ENV_DESC")}
          </p>
          <CodeBlock language="bash" code={hermesEnvCode} />

          {/* Key Configuration Details */}
          <h3
            className="mt-8 mb-4 text-lg font-medium"
            id="key-configuration-details"
          >
            {t("DOCS.HERMES.KEY_CONFIG_DETAILS")}
          </h3>
          <div className="overflow-x-auto">
            <table className="text-muted-foreground w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-foreground py-2 pr-4 text-left font-semibold">
                    {t("DOCS.HERMES.CONFIG_TABLE_FIELD")}
                  </th>
                  <th className="text-foreground py-2 text-left font-semibold">
                    {t("DOCS.HERMES.CONFIG_TABLE_DESC")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-border border-b">
                  <td className="py-2 pr-4 font-mono text-xs">
                    model.provider
                  </td>
                  <td className="py-2">
                    {t("DOCS.HERMES.CONFIG_PROVIDER_DESC")}
                  </td>
                </tr>
                <tr className="border-border border-b">
                  <td className="py-2 pr-4 font-mono text-xs">
                    model.base_url
                  </td>
                  <td className="py-2">
                    {t("DOCS.HERMES.CONFIG_BASEURL_DESC", APP_VALUES)}
                  </td>
                </tr>
                <tr className="border-border border-b">
                  <td className="py-2 pr-4 font-mono text-xs">model.default</td>
                  <td className="py-2">
                    {t("DOCS.HERMES.CONFIG_MODEL_DESC")}
                  </td>
                </tr>
                <tr className="border-border border-b">
                  <td className="py-2 pr-4 font-mono text-xs">
                    OPENAI_API_KEY
                  </td>
                  <td className="py-2">
                    {t("DOCS.HERMES.CONFIG_APIKEY_DESC", APP_VALUES)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <Callout
            type="warn"
            title={t("DOCS.HERMES.CONTEXT_NOTE_TITLE")}
            className="mt-6"
          >
            <p>{t("DOCS.HERMES.CONTEXT_NOTE_DESC")}</p>
          </Callout>

          {/* CLI alternative */}
          <h3 className="mt-8 mb-4 text-lg font-medium" id="cli-alternative">
            {t("DOCS.HERMES.CLI_ALT")}
          </h3>
          <p className="text-muted-foreground mb-3 text-sm">
            {t("DOCS.HERMES.CLI_ALT_DESC")}
          </p>
          <CodeBlock
            language="bash"
            code={`hermes config set model.provider custom
hermes config set model.base_url ${env.apiUrl}/v1
hermes config set OPENAI_API_KEY ${docs.placeholder}`}
          />

          {/* Run Hermes */}
          <h3 className="mt-8 mb-4 text-lg font-medium" id="run-hermes">
            {t("DOCS.HERMES.RUN")}
          </h3>
          <p className="text-muted-foreground mb-3 text-sm">
            {t("DOCS.HERMES.RUN_DESC")}
          </p>
          <CodeBlock
            language="bash"
            code={`# Interactive TUI (recommended)
hermes --tui

# Switch model or provider any time
hermes model

# Diagnose configuration
hermes doctor`}
          />
        </section>

        {/* CTA */}
        <section className="border-border mt-16 border-t pt-12 text-center">
          <h2 className="text-2xl font-semibold">
            {t("DOCS.HERMES.CTA_TITLE")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t("DOCS.HERMES.CTA_DESC", APP_VALUES)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <GetStartedButton
              translationKey="DOCS.HERMES.CTA_SIGNUP"
              authedTranslationKey="DOCS.HERMES.CTA_DASHBOARD"
            />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/models" />}
            >
              {t("DOCS.HERMES.CTA_MODELS")}
            </Button>
          </div>
        </section>
      </div>
    </TOCLayout>
  );
}
