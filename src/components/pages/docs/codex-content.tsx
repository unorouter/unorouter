import { Callout } from "@/components/elements/content/callout";
import { CodeBlock } from "@/components/elements/code/code-block";
import { OSCodeBlock } from "./os-code-block";
import { buildOSVariants, envVarCode } from "./os-code-helpers";
import { OS } from "@/lib/types/enums";
import { GetStartedButton } from "@/components/elements/brand/get-started-link";
import { PageHeader } from "@/components/elements/content/page-header";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getDocsApiKey } from "@/lib/utils/server";
import OpenAI from "@lobehub/icons/es/OpenAI";
import { getTranslations } from "next-intl/server";
import { CCSwitchSetup } from "./cc-switch-setup";
import { OSTabs } from "./os-tabs";

export async function CodexContent() {
  const t = await getTranslations();
  const docs = await getDocsApiKey();

  const toc = createTOC([
    { title: t("DOCS.CODEX.FEATURES_TITLE"), url: "#features", depth: 2 },
    {
      title: t("DOCS.CC_SWITCH_SETUP_TITLE"),
      url: "#cc-switch-setup",
      depth: 2,
    },
    {
      title: t("DOCS.CODEX.AI_CONFIG_TITLE"),
      url: "#ai-model-configuration",
      depth: 2,
    },
  ]);

  const windowsInstall = (
    <div className="mt-6 space-y-6">
      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.WINDOWS_STEP2_TITLE")}
        </h4>
        <p className="text-muted-foreground mb-3 text-sm">
          {t("DOCS.CODEX.WINDOWS_STEP2_DESC")}
        </p>
        <CodeBlock language="powershell" code="wsl --install" />
      </div>
      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.WINDOWS_STEP3_TITLE")}
        </h4>
        <CodeBlock language="bash" code="npm i -g @openai/codex" />
      </div>
    </div>
  );

  const macosInstall = (
    <div className="mt-6 space-y-6">
      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.MACOS_STEP2_TITLE")}
        </h4>
        <CodeBlock language="bash" code={`brew update\nbrew install node`} />
      </div>
      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.MACOS_STEP3_TITLE")}
        </h4>
        <CodeBlock language="bash" code="npm install -g @openai/codex" />
      </div>
    </div>
  );

  const linuxInstall = (
    <div className="mt-6 space-y-6">
      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.LINUX_STEP1_TITLE")}
        </h4>
        <CodeBlock
          language="bash"
          code={`curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -\nsudo apt-get install -y nodejs`}
        />
      </div>
      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.LINUX_STEP2_TITLE")}
        </h4>
        <CodeBlock language="bash" code="npm install -g @openai/codex" />
      </div>
    </div>
  );

  const codexAuthCode = `{
  "OPENAI_API_KEY": "${docs.placeholder}"
}`;

  const authVariants = await buildOSVariants({
    windows: {
      code: codexAuthCode,
      language: "json",
      label: "%APPDATA%\\codex\\auth.json",
    },
    macos: {
      code: codexAuthCode,
      language: "json",
      label: "~/.codex/auth.json",
    },
    linux: {
      code: codexAuthCode,
      language: "json",
      label: "~/.codex/auth.json",
    },
  });

  const configToml = `model = "${docs.modelFor("OpenAI")}"

[model_providers.custom]
base_url = "${docs.apiUrl}/v1"
wire_api = "responses"`;

  const configVariants = await buildOSVariants({
    windows: {
      code: configToml,
      language: "toml",
      label: "%APPDATA%\\codex\\config.toml",
    },
    macos: {
      code: configToml,
      language: "toml",
      label: "~/.codex/config.toml",
    },
    linux: {
      code: configToml,
      language: "toml",
      label: "~/.codex/config.toml",
    },
  });

  const envVars = {
    OPENAI_BASE_URL: docs.apiUrl + "/v1",
    OPENAI_API_KEY: docs.placeholder,
  };

  const envVariants = await buildOSVariants({
    windows: { code: envVarCode(envVars, OS.WINDOWS), language: "powershell" },
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

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <PageHeader
          badge={t("DOCS.CODEX.BADGE")}
          badgeIcon={OpenAI}
          title={t("DOCS.CODEX.TITLE")}
          subtitle={t("DOCS.CODEX.SUBTITLE", APP_VALUES)}
          centered
        />

        <Callout type="info" title={t("DOCS.CODEX.PROJECT_INTRO_TITLE")}>
          <p>{t("DOCS.CODEX.PROJECT_INTRO")}</p>
          <div className="mt-3 flex flex-wrap gap-4">
            <a
              href="https://chatgpt.com/codex"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t("DOCS.CODEX.PROJECT_OFFICIAL")}
            </a>
            <a
              href="https://github.com/openai/codex"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {t("DOCS.CODEX.PROJECT_GITHUB")}
            </a>
          </div>
        </Callout>

        {/* Features */}
        <section className="mt-12">
          <h2 className="mb-6 text-2xl font-semibold" id="features">
            {t("DOCS.CODEX.FEATURES_TITLE")}
          </h2>
          <div className="border-border overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <tbody className="divide-border divide-y">
                {(
                  [
                    { t: "TERMINAL", d: "TERMINAL" },
                    { t: "TOOL", d: "TOOL" },
                    { t: "PATCH", d: "PATCH" },
                    { t: "SANDBOX", d: "SANDBOX" },
                    { t: "PLAN", d: "PLAN" },
                    { t: "MULTIMODAL", d: "MULTIMODAL" },
                  ] as const
                ).map((f) => (
                  <tr key={f.t}>
                    <td className="bg-muted/50 px-4 py-3 font-medium">
                      {t(`DOCS.CODEX.FEATURES_${f.t}_TITLE`)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {t(`DOCS.CODEX.FEATURES_${f.d}_DESC`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CC Switch Quick Setup */}
        <CCSwitchSetup
          app="codex"
          endpoint={`${process.env.NEXT_PUBLIC_API_URL}/v1`}
          cliCodeBlock={
            <CodeBlock language="bash" code="cc-switch provider add" />
          }
        />

        {/* Manual Configuration */}
        <section className="mt-12">
          <h2
            className="mb-6 text-2xl font-semibold"
            id="ai-model-configuration"
          >
            {t("DOCS.CODEX.AI_CONFIG_TITLE")}
          </h2>

          {/* Config files (recommended) */}
          <h3 className="mb-2 text-lg font-medium">
            {t("DOCS.CONFIG_FILE_LABEL")}
          </h3>
          <p className="text-muted-foreground mb-3 text-sm">
            {t("DOCS.CONFIG_FILE_DESC")}
          </p>
          <OSCodeBlock variants={authVariants} placeholder={docs.placeholder} />
          <div className="mt-4" />
          <OSCodeBlock
            variants={configVariants}
            placeholder={docs.placeholder}
          />

          {/* Env vars (alternative) */}
          <h3 className="mt-8 mb-2 text-lg font-medium">
            {t("DOCS.CONFIG_ENV_LABEL")}
          </h3>
          <p className="text-muted-foreground mb-3 text-sm">
            {t("DOCS.CONFIG_ENV_DESC")}
          </p>
          <OSCodeBlock variants={envVariants} placeholder={docs.placeholder} />

          {/* Installation per OS */}
          <h3 className="mt-10 mb-2 text-lg font-medium">
            {t("DOCS.CODEX.INSTALLATION_TITLE")}
          </h3>
          <OSTabs
            windowsContent={windowsInstall}
            macosContent={macosInstall}
            linuxContent={linuxInstall}
            labels={{
              windows: t("DOCS.OS_TAB_WINDOWS"),
              macos: t("DOCS.OS_TAB_MACOS"),
              linux: t("DOCS.OS_TAB_LINUX"),
            }}
          />
        </section>

        {/* CTA */}
        <section className="border-border mt-16 border-t pt-12 text-center">
          <h2 className="text-2xl font-semibold">
            {t("DOCS.CODEX.CTA_TITLE")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t("DOCS.CODEX.CTA_DESC", APP_VALUES)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <GetStartedButton translationKey="DOCS.CODEX.CTA_SIGNUP" />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/models" />}
            >
              {t("DOCS.CODEX.CTA_MODELS")}
            </Button>
          </div>
        </section>
      </div>
    </TOCLayout>
  );
}
