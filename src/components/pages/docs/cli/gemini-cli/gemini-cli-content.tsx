import { ApiKeyCodeBlock } from "@/components/elements/code/api-key-code-block";
import { Callout } from "@/components/elements/content/callout";
import {
  CodeBlock,
  highlightCode,
} from "@/components/elements/code/code-block";
import { GetStartedButton } from "@/components/elements/brand/get-started-link";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { PageHeader } from "@/components/elements/content/page-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { getDocsApiKey } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import Gemini from "@lobehub/icons/es/Gemini";
import { CCSwitchSetup } from "../cc-switch/cc-switch-setup";
import { OSCodeBlock } from "../../os/os-code-block";
import { buildOSVariants, envVarCode } from "../../os/os-code-helpers";
import { OS } from "@/lib/types/enums";
import { OSTabs } from "../../os/os-tabs";

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
        title: t("DOCS.SETUP.TITLE"),
        url: "#cc-switch-setup",
        depth: 2,
      },
      {
        title: t("DOCS.GEMINI_CLI.TOC_INSTALLATION"),
        url: "#installation",
        depth: 2,
      },
      {
        title: t("DOCS.GEMINI_CLI.TOC_CONFIGURATION"),
        url: "#configuration",
        depth: 2,
      },
      { title: t("DOCS.GEMINI_CLI.TOC_USAGE"), url: "#usage", depth: 2 },
    ],
    t("DOCS.TOC_TITLE"),
  );

  const geminiConfigCode = `GEMINI_API_KEY=${docs.placeholder}
GOOGLE_GEMINI_BASE_URL=${env.apiUrl}`;

  const envVars = {
    GEMINI_API_KEY: docs.placeholder,
    GOOGLE_GEMINI_BASE_URL: docs.apiUrl,
  };

  const quickStartVariants = await buildOSVariants({
    windows: {
      code: `${envVarCode(envVars, OS.WINDOWS)}\n\n# Then run Gemini CLI\ngemini`,
      language: "powershell",
    },
    macos: {
      code: `${envVarCode(envVars, OS.MACOS)}\n\n# Then run Gemini CLI\ngemini`,
      language: "bash",
    },
    linux: {
      code: `${envVarCode(envVars, OS.LINUX)}\n\n# Then run Gemini CLI\ngemini`,
      language: "bash",
    },
  });

  const envVariants = await buildOSVariants({
    windows: {
      code: envVarCode(envVars, OS.WINDOWS),
      language: "powershell",
    },
    macos: {
      code: envVarCode(envVars, OS.MACOS),
      language: "bash",
      label: "~/.zshrc",
    },
    linux: {
      code: envVarCode(envVars, OS.LINUX),
      language: "bash",
      label: "~/.bashrc",
    },
  });

  const windowsInstall = (
    <div className="mt-6 space-y-6">
      <div>
        <p className="text-muted-foreground mb-3 text-sm">
          {t("DOCS.GEMINI_CLI.INSTALL_WINDOWS_DESC")}
        </p>
        <CodeBlock
          language="powershell"
          code="npm install -g @google/gemini-cli"
        />
      </div>
    </div>
  );

  const macosInstall = (
    <div className="mt-6 space-y-6">
      <div>
        <CodeBlock language="bash" code="npm install -g @google/gemini-cli" />
      </div>
    </div>
  );

  const linuxInstall = (
    <div className="mt-6 space-y-6">
      <div>
        <CodeBlock language="bash" code="npm install -g @google/gemini-cli" />
      </div>
    </div>
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
          <OSCodeBlock
            variants={quickStartVariants}
            placeholder={docs.placeholder}
          />
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
          endpoint={env.apiUrl}
          cliCodeBlock={
            <CodeBlock language="bash" code="cc-switch provider add" />
          }
        />

        {/* Installation */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="installation">
            {t("DOCS.GEMINI_CLI.INSTALLATION")}
          </h2>

          <OSTabs
            windowsContent={windowsInstall}
            macosContent={macosInstall}
            linuxContent={linuxInstall}
            labels={{
              windows: t("DOCS.OS.WINDOWS"),
              macos: t("DOCS.OS.MACOS"),
              linux: t("DOCS.OS.LINUX"),
            }}
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
            {t("DOCS.CONFIG.FILE_LABEL")}
          </h3>
          <p className="text-muted-foreground mb-3 text-sm">
            {t("DOCS.CONFIG.FILE_DESC")}
          </p>
          <ApiKeyCodeBlock
            html={await highlightCode(geminiConfigCode, "bash")}
            code={geminiConfigCode}
            language="bash"
            label="~/.gemini/.env"
            placeholder={docs.placeholder}
          />

          {/* Env vars (alternative) */}
          <h3 className="mt-8 mb-2 text-lg font-medium">
            {t("DOCS.CONFIG.ENV_LABEL")}
          </h3>
          <p className="text-muted-foreground mb-3 text-sm">
            {t("DOCS.CONFIG.ENV_DESC")}
          </p>
          <OSCodeBlock variants={envVariants} placeholder={docs.placeholder} />
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
/model ${docs.modelFor("Google")}`}
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
            <GetStartedButton translationKey="DOCS.GEMINI_CLI.CTA_SIGNUP"
              authedTranslationKey="DOCS.GEMINI_CLI.CTA_DASHBOARD" />
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
