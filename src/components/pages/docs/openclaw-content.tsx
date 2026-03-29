import { APP_VALUES } from "@/lib/config/constants";
import { PageHeader } from "@/components/elements/content/page-header";
import { Button } from "@/components/ui/button";
import { GetStartedButton } from "@/components/elements/brand/get-started-link";
import { CodeBlock } from "@/components/elements/code/code-block";
import { Callout } from "@/components/elements/content/callout";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { Link } from "@/i18n/navigation";
import { getDocsApiKey } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { GiCrabClaw } from "react-icons/gi";
import { CCSwitchSetup } from "./cc-switch-setup";
import { OSCodeBlock } from "./os-code-block";
import { buildOSVariants } from "./os-code-helpers";

export async function OpenClawContent() {
  const t = await getTranslations();
  const docs = await getDocsApiKey();

  const toc = createTOC(
    [
      {
        title: t("DOCS.OPENCLAW.TOC_CORE_FEATURES"),
        url: "#core-features",
        depth: 2,
      },
      {
        title: t("DOCS.CC_SWITCH_SETUP_TITLE"),
        url: "#cc-switch-setup",
        depth: 2,
      },
      {
        title: t("DOCS.OPENCLAW.TOC_INSTALLATION"),
        url: "#installation",
        depth: 2,
      },
      {
        title: t("DOCS.OPENCLAW.TOC_CONFIGURATION"),
        url: "#configuration",
        depth: 2,
      },
      {
        title: t("DOCS.OPENCLAW.TOC_KEY_CONFIG"),
        url: "#key-configuration-details",
        depth: 3,
      },
      {
        title: t("DOCS.OPENCLAW.TOC_START_SERVICE"),
        url: "#start-the-service",
        depth: 3,
      },
    ],
    t("DOCS.TOC_TITLE"),
  );

  const openclawConfigCode = `{
  "env": {
    "OPENAI_API_KEY": "${docs.placeholder}"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "openai/${docs.modelFor("OpenAI")}"
      }
    }
  },
  "providers": {
    "openai": {
      "baseUrl": "${process.env.NEXT_PUBLIC_API_URL}/v1",
      "apiKey": "env:OPENAI_API_KEY"
    }
  }
}`;

  const configVariants = await buildOSVariants({
    windows: {
      code: openclawConfigCode,
      language: "json",
      label: "%APPDATA%\\openclaw\\config.json",
    },
    macos: {
      code: openclawConfigCode,
      language: "json",
      label: "~/.openclaw/config.json",
    },
    linux: {
      code: openclawConfigCode,
      language: "json",
      label: "~/.openclaw/config.json",
    },
  });

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <PageHeader
          badge={t("DOCS.OPENCLAW.BADGE")}
          badgeIcon={GiCrabClaw}
          title={t("DOCS.OPENCLAW.TITLE")}
          subtitle={t("DOCS.OPENCLAW.SUBTITLE", APP_VALUES)}
          centered
        />

        {/* Project Intro */}
        <Callout type="info" title={t("DOCS.OPENCLAW.INTRO_TITLE")}>
          <p>{t("DOCS.OPENCLAW.INTRO_DESC")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              <a
                href="https://openclaw.ai"
                target="_blank"
                className="text-primary underline"
              >
                openclaw.ai
              </a>
            </li>
            <li>
              <a
                href="https://docs.openclaw.ai"
                target="_blank"
                className="text-primary underline"
              >
                docs.openclaw.ai
              </a>
            </li>
            <li>
              <a
                href="https://github.com/openclaw/openclaw"
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
            {t("DOCS.OPENCLAW.CORE_FEATURES")}
          </h2>
          <ul className="text-muted-foreground space-y-3 text-sm">
            <li>
              <strong>{t("DOCS.OPENCLAW.FEATURE_MULTI_CHANNEL")}</strong>
              {" \u2014 "}
              {t("DOCS.OPENCLAW.FEATURE_MULTI_CHANNEL_DESC")}
            </li>
            <li>
              <strong>{t("DOCS.OPENCLAW.FEATURE_SELF_HOSTED")}</strong>
              {" \u2014 "}
              {t("DOCS.OPENCLAW.FEATURE_SELF_HOSTED_DESC")}
            </li>
            <li>
              <strong>{t("DOCS.OPENCLAW.FEATURE_AGENT")}</strong>
              {" \u2014 "}
              {t("DOCS.OPENCLAW.FEATURE_AGENT_DESC")}
            </li>
          </ul>
        </section>

        {/* CC Switch Quick Setup */}
        <CCSwitchSetup
          app="openclaw"
          endpoint={`${process.env.NEXT_PUBLIC_API_URL}/v1`}
          cliCodeBlock={
            <CodeBlock language="bash" code="cc-switch provider add" />
          }
        />

        {/* Installation */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="installation">
            {t("DOCS.OPENCLAW.INSTALLATION")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.OPENCLAW.INSTALLATION_PREREQ")}
          </p>
          <CodeBlock
            language="bash"
            code={`# Install OpenClaw globally
npm install -g openclaw@latest

# Run the onboarding wizard
openclaw onboard`}
          />
        </section>

        {/* Configuration */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="configuration">
            {t("DOCS.OPENCLAW.CONFIGURATION")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.OPENCLAW.CONFIG_LOCATION", APP_VALUES)}
          </p>
          <OSCodeBlock
            variants={configVariants}
            placeholder={docs.placeholder}
          />

          {/* Key Configuration Details */}
          <h3
            className="mt-8 mb-4 text-lg font-medium"
            id="key-configuration-details"
          >
            {t("DOCS.OPENCLAW.KEY_CONFIG_DETAILS")}
          </h3>
          <div className="overflow-x-auto">
            <table className="text-muted-foreground w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-foreground py-2 pr-4 text-left font-semibold">
                    {t("DOCS.OPENCLAW.CONFIG_TABLE_FIELD")}
                  </th>
                  <th className="text-foreground py-2 text-left font-semibold">
                    {t("DOCS.OPENCLAW.CONFIG_TABLE_DESC")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-border border-b">
                  <td className="py-2 pr-4 font-mono text-xs">
                    providers.openai.baseUrl
                  </td>
                  <td className="py-2">
                    {t("DOCS.OPENCLAW.CONFIG_BASEURL_DESC", APP_VALUES)}
                  </td>
                </tr>
                <tr className="border-border border-b">
                  <td className="py-2 pr-4 font-mono text-xs">
                    providers.openai.apiKey
                  </td>
                  <td className="py-2">
                    {t("DOCS.OPENCLAW.CONFIG_APIKEY_DESC", APP_VALUES)}
                  </td>
                </tr>
                <tr className="border-border border-b">
                  <td className="py-2 pr-4 font-mono text-xs">
                    agents.defaults.model.primary
                  </td>
                  <td className="py-2">
                    {t("DOCS.OPENCLAW.CONFIG_MODEL_DESC")}
                  </td>
                </tr>
                <tr className="border-border border-b">
                  <td className="py-2 pr-4 font-mono text-xs">env</td>
                  <td className="py-2">{t("DOCS.OPENCLAW.CONFIG_ENV_DESC")}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Start the Service */}
          <h3 className="mt-8 mb-4 text-lg font-medium" id="start-the-service">
            {t("DOCS.OPENCLAW.START_SERVICE")}
          </h3>
          <CodeBlock language="bash" code={`openclaw start`} />
        </section>

        {/* CTA */}
        <section className="border-border mt-16 border-t pt-12 text-center">
          <h2 className="text-2xl font-semibold">
            {t("DOCS.OPENCLAW.CTA_TITLE")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t("DOCS.OPENCLAW.CTA_DESC", APP_VALUES)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <GetStartedButton translationKey="DOCS.OPENCLAW.CTA_SIGNUP" />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/models" />}
            >
              {t("DOCS.OPENCLAW.CTA_MODELS")}
            </Button>
          </div>
        </section>
      </div>
    </TOCLayout>
  );
}
