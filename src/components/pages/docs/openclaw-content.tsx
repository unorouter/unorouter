import { APP_VALUES } from "@/lib/config/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GetStartedButton } from "@/components/elements/get-started-link";
import { CodeBlock } from "@/components/elements/code-block";
import { Callout } from "@/components/elements/callout";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function OpenClawContent() {
  const t = await getTranslations();

  const toc = createTOC(
    [
      {
        title: t("DOCS.OPENCLAW.TOC_CORE_FEATURES"),
        url: "#core-features",
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

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {t("DOCS.OPENCLAW.BADGE")}
          </Badge>
        </div>

        <h1 className="mt-4 text-4xl font-bold">{t("DOCS.OPENCLAW.TITLE")}</h1>
        <p className="text-muted-foreground mt-4 text-lg">
          {t("DOCS.OPENCLAW.SUBTITLE", APP_VALUES)}
        </p>

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
        <section className="mt-12" id="core-features">
          <h2 className="mb-4 text-2xl font-semibold">
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

        {/* Installation */}
        <section className="mt-12" id="installation">
          <h2 className="mb-4 text-2xl font-semibold">
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
        <section className="mt-12" id="configuration">
          <h2 className="mb-4 text-2xl font-semibold">
            {t("DOCS.OPENCLAW.CONFIGURATION")}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.OPENCLAW.CONFIG_LOCATION", APP_VALUES)}
          </p>
          <CodeBlock
            language="json"
            code={`{
  "env": {
    "OPENAI_API_KEY": "YOUR_API_KEY"
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "openai/gpt-5.2"
      }
    }
  },
  "providers": {
    "openai": {
      "baseUrl": "${process.env.NEXT_PUBLIC_API_URL}/v1",
      "apiKey": "env:OPENAI_API_KEY"
    }
  }
}`}
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
