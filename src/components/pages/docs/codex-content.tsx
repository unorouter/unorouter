import { APP_VALUES } from "@/lib/config/constants";
import { PageHeader } from "@/components/elements/page-header";
import { Button } from "@/components/ui/button";
import { GetStartedButton } from "@/components/elements/get-started-link";
import { CodeBlock } from "@/components/elements/code-block";
import { Callout } from "@/components/elements/callout";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import OpenAI from "@lobehub/icons/es/OpenAI";
import { OSTabs } from "./os-tabs";
import { CCSwitchSetup } from "./cc-switch-setup";

export async function CodexContent() {
  const t = await getTranslations();

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

  const windowsGuide = (
    <div className="mt-6 space-y-6">
      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.WINDOWS_STEP1_TITLE")}
        </h4>
        <p className="text-muted-foreground mb-3 text-sm">
          {t("DOCS.CODEX.WINDOWS_STEP1_DESC")}
        </p>
      </div>

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

      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.WINDOWS_STEP4_TITLE", APP_VALUES)}
        </h4>
        <p className="text-muted-foreground mb-3 text-sm">
          {t("DOCS.CODEX.WINDOWS_STEP4_DESC", APP_VALUES)}
        </p>
        <CodeBlock
          language="bash"
          code={`export OPENAI_BASE_URL="${process.env.NEXT_PUBLIC_API_URL}/v1"
export OPENAI_API_KEY="your-api-key-here"`}
        />
      </div>

      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.WINDOWS_STEP5_TITLE")}
        </h4>
        <CodeBlock language="bash" code="codex" />
      </div>
    </div>
  );

  const macosGuide = (
    <div className="mt-6 space-y-6">
      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.MACOS_STEP1_TITLE")}
        </h4>
        <p className="text-muted-foreground mb-3 text-sm">
          {t("DOCS.CODEX.MACOS_STEP1_DESC")}
        </p>
        <CodeBlock
          language="bash"
          code={'/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'}
        />
      </div>

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

      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.MACOS_STEP4_TITLE", APP_VALUES)}
        </h4>
        <p className="text-muted-foreground mb-3 text-sm">
          {t("DOCS.CODEX.MACOS_STEP4_DESC", APP_VALUES)}
        </p>
        <CodeBlock
          language="bash"
          code={`# Add to your ~/.zshrc or ~/.bashrc
export OPENAI_BASE_URL="${process.env.NEXT_PUBLIC_API_URL}/v1"
export OPENAI_API_KEY="your-api-key-here"

# Reload your shell
source ~/.zshrc`}
        />
      </div>

      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.MACOS_STEP5_TITLE")}
        </h4>
        <CodeBlock language="bash" code="codex" />
      </div>

      <Callout type="warn" title={t("DOCS.CODEX.MACOS_ISSUES_TITLE")}>
        <ul className="list-disc space-y-2 pl-4">
          <li>{t("DOCS.CODEX.MACOS_ISSUES_NODE")}</li>
          <li>{t("DOCS.CODEX.MACOS_ISSUES_PERMISSION")}</li>
        </ul>
      </Callout>
    </div>
  );

  const linuxGuide = (
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

      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.LINUX_STEP3_TITLE", APP_VALUES)}
        </h4>
        <p className="text-muted-foreground mb-3 text-sm">
          {t("DOCS.CODEX.LINUX_STEP3_DESC", APP_VALUES)}
        </p>
        <CodeBlock
          language="bash"
          code={`# Add to your ~/.bashrc or ~/.zshrc
export OPENAI_BASE_URL="${process.env.NEXT_PUBLIC_API_URL}/v1"
export OPENAI_API_KEY="your-api-key-here"

# Reload your shell
source ~/.bashrc`}
        />
      </div>

      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CODEX.LINUX_STEP4_TITLE")}
        </h4>
        <CodeBlock language="bash" code="codex" />
      </div>

      <Callout type="warn" title={t("DOCS.CODEX.LINUX_ISSUES_TITLE")}>
        <ul className="list-disc space-y-2 pl-4">
          <li>{t("DOCS.CODEX.LINUX_ISSUES_NODE")}</li>
          <li>{t("DOCS.CODEX.LINUX_ISSUES_PERMISSION")}</li>
        </ul>
      </Callout>
    </div>
  );

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
        <section className="mt-12" id="features">
          <h2 className="mb-6 text-2xl font-semibold">
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
        <section className="mt-12" id="ai-model-configuration">
          <h2 className="mb-6 text-2xl font-semibold">
            {t("DOCS.CODEX.AI_CONFIG_TITLE")}
          </h2>

          <OSTabs
            windowsContent={windowsGuide}
            macosContent={macosGuide}
            linuxContent={linuxGuide}
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
