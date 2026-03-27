import { Callout } from "@/components/elements/callout";
import { CodeBlock } from "@/components/elements/code-block";
import { GetStartedButton } from "@/components/elements/get-started-link";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { PageHeader } from "@/components/elements/page-header";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import Claude from "@lobehub/icons/es/Claude";
import { OSTabs } from "./os-tabs";
import { CCSwitchSetup } from "./cc-switch-setup";

export async function ClaudeCodeContent() {
  const t = await getTranslations();

  const toc = createTOC(
    [
      { title: t("DOCS.CLAUDE_CODE.TOC_FEATURES"), url: "#features", depth: 2 },
      {
        title: t("DOCS.CC_SWITCH_SETUP_TITLE"),
        url: "#cc-switch-setup",
        depth: 2,
      },
      {
        title: t("DOCS.CLAUDE_CODE.TOC_CONFIG"),
        url: "#ai-model-configuration",
        depth: 2,
      },
    ],
    t("DOCS.TOC_TITLE"),
  );

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const features = [
    { titleKey: "FEATURE_AGENTIC_TITLE", descKey: "FEATURE_AGENTIC_DESC" },
    { titleKey: "FEATURE_CODEBASE_TITLE", descKey: "FEATURE_CODEBASE_DESC" },
    { titleKey: "FEATURE_TERMINAL_TITLE", descKey: "FEATURE_TERMINAL_DESC" },
    { titleKey: "FEATURE_GIT_TITLE", descKey: "FEATURE_GIT_DESC" },
    { titleKey: "FEATURE_MCP_TITLE", descKey: "FEATURE_MCP_DESC" },
    {
      titleKey: "FEATURE_MULTIMODEL_TITLE",
      descKey: "FEATURE_MULTIMODEL_DESC",
    },
    { titleKey: "FEATURE_THINKING_TITLE", descKey: "FEATURE_THINKING_DESC" },
    { titleKey: "FEATURE_INPUT_TITLE", descKey: "FEATURE_INPUT_DESC" },
    { titleKey: "FEATURE_SAFE_TITLE", descKey: "FEATURE_SAFE_DESC" },
  ] as const;

  const windowsInstall = (
    <div className="mt-6 space-y-6">
      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CLAUDE_CODE.WIN_STEP1_TITLE")}
        </h4>
        <p className="text-muted-foreground mb-3 text-sm">
          {t.rich("DOCS.CLAUDE_CODE.WIN_STEP1_DESC", {
            link: (chunks) => (
              <a
                href="https://nodejs.org"
                target="_blank"
                className="text-primary underline"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CLAUDE_CODE.WIN_STEP2_TITLE")}
        </h4>
        <p className="text-muted-foreground mb-3 text-sm">
          {t.rich("DOCS.CLAUDE_CODE.WIN_STEP2_DESC", {
            link: (chunks) => (
              <a
                href="https://git-scm.com/downloads/win"
                target="_blank"
                className="text-primary underline"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CLAUDE_CODE.WIN_STEP3_TITLE")}
        </h4>
        <CodeBlock
          language="bash"
          code="npm install -g @anthropic-ai/claude-code"
        />
      </div>
    </div>
  );

  const macosInstall = (
    <div className="mt-6 space-y-6">
      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CLAUDE_CODE.MAC_STEP1_TITLE")}
        </h4>
        <p className="text-muted-foreground mb-3 text-sm">
          {t.rich("DOCS.CLAUDE_CODE.MAC_STEP1_DESC", {
            link: (chunks) => (
              <a
                href="https://brew.sh"
                target="_blank"
                className="text-primary underline"
              >
                {chunks}
              </a>
            ),
          })}
        </p>
        <CodeBlock
          language="bash"
          code={`brew install node
npm install -g @anthropic-ai/claude-code`}
        />
      </div>

      <Callout
        type="warn"
        title={t("DOCS.CLAUDE_CODE.MAC_ISSUE_PERMISSION_TITLE")}
      >
        <p>
          {t("DOCS.CLAUDE_CODE.MAC_ISSUE_PERMISSION_DESC", {
            code: "EACCES",
          })}
        </p>
        <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 text-xs">
          {`mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc`}
        </pre>
      </Callout>
    </div>
  );

  const linuxInstall = (
    <div className="mt-6 space-y-6">
      <div>
        <h4 className="mb-2 text-lg font-medium">
          {t("DOCS.CLAUDE_CODE.LINUX_STEP1_TITLE")}
        </h4>
        <CodeBlock
          language="bash"
          code={`# Via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install --lts

# Or via package manager (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Claude Code
npm install -g @anthropic-ai/claude-code`}
        />
      </div>

      <Callout
        type="warn"
        title={t("DOCS.CLAUDE_CODE.LINUX_ISSUE_BUILD_TITLE")}
      >
        <p>{t("DOCS.CLAUDE_CODE.LINUX_ISSUE_BUILD_DESC")}</p>
        <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 text-xs">
          sudo apt-get install -y build-essential
        </pre>
      </Callout>
    </div>
  );

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <PageHeader
          badge={t("DOCS.CLAUDE_CODE.BADGE")}
          badgeIcon={Claude}
          title={t("DOCS.CLAUDE_CODE.TITLE")}
          subtitle={t("DOCS.CLAUDE_CODE.SUBTITLE", APP_VALUES)}
          centered
        />

        <Callout type="info" title={t("DOCS.CLAUDE_CODE.ABOUT_TITLE")}>
          <p>
            {t.rich("DOCS.CLAUDE_CODE.ABOUT_DESC", {
              link: (chunks) => (
                <a
                  href="https://docs.anthropic.com/en/docs/claude-code/overview"
                  target="_blank"
                  className="text-primary underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </Callout>

        {/* Features */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="features">
            {t("DOCS.CLAUDE_CODE.FEATURES_TITLE")}
          </h2>
          <div className="overflow-x-auto">
            <table className="border-border w-full border-collapse text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground px-4 py-3 text-left font-semibold">
                    {t("DOCS.CLAUDE_CODE.FEATURES_COL_FEATURE")}
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-semibold">
                    {t("DOCS.CLAUDE_CODE.FEATURES_COL_DESCRIPTION")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {features.map((f) => (
                  <tr key={f.titleKey}>
                    <td className="px-4 py-3 font-medium">
                      {t(`DOCS.CLAUDE_CODE.${f.titleKey}`)}
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {t(`DOCS.CLAUDE_CODE.${f.descKey}`, APP_VALUES)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CC Switch Quick Setup */}
        <CCSwitchSetup
          app="claude"
          endpoint={apiUrl!}
          cliCodeBlock={
            <CodeBlock language="bash" code="cc-switch provider add" />
          }
        />

        {/* Manual Configuration */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="ai-model-configuration">
            {t("DOCS.CLAUDE_CODE.CONFIG_TITLE")}
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">
            {t("DOCS.CLAUDE_CODE.CONFIG_DESC", APP_VALUES)}
          </p>

          {/* Config file (recommended) */}
          <h3 className="mb-2 text-lg font-medium">
            {t("DOCS.CONFIG_FILE_LABEL")}
          </h3>
          <p className="text-muted-foreground mb-3 text-sm">
            {t("DOCS.CONFIG_FILE_DESC")}
          </p>
          <CodeBlock
            language="json"
            code={`// ~/.claude/settings.json
{
  "env": {
    "ANTHROPIC_BASE_URL": "${apiUrl}",
    "ANTHROPIC_API_KEY": "your-api-key-here"
  }
}`}
          />

          {/* Env vars (alternative) */}
          <h3 className="mt-8 mb-2 text-lg font-medium">
            {t("DOCS.CONFIG_ENV_LABEL")}
          </h3>
          <p className="text-muted-foreground mb-3 text-sm">
            {t("DOCS.CONFIG_ENV_DESC")}
          </p>
          <CodeBlock
            language="bash"
            code={`export ANTHROPIC_BASE_URL="${apiUrl}"
export ANTHROPIC_API_KEY="your-api-key-here"`}
          />

          {/* Installation per OS */}
          <h3 className="mt-10 mb-2 text-lg font-medium">
            {t("DOCS.CLAUDE_CODE.INSTALLATION_TITLE")}
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
            {t("DOCS.CLAUDE_CODE.CTA_TITLE")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t("DOCS.CLAUDE_CODE.CTA_DESC", APP_VALUES)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <GetStartedButton translationKey="DOCS.CLAUDE_CODE.CTA_SIGNUP" />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/models" />}
            >
              {t("DOCS.CLAUDE_CODE.CTA_MODELS")}
            </Button>
          </div>
        </section>
      </div>
    </TOCLayout>
  );
}
