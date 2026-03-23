import { Callout } from "@/components/elements/callout";
import { CodeBlock } from "@/components/elements/code-block";
import { GetStartedButton } from "@/components/elements/get-started-link";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function ClaudeCodeContent() {
  const t = await getTranslations();

  const toc = createTOC(
    [
      { title: t("DOCS.CLAUDE_CODE.TOC_DEMO"), url: "#demo", depth: 2 },
      { title: t("DOCS.CLAUDE_CODE.TOC_FEATURES"), url: "#features", depth: 2 },
      {
        title: t("DOCS.CLAUDE_CODE.TOC_CONFIG"),
        url: "#ai-model-configuration",
        depth: 2,
      },
      {
        title: t("DOCS.CLAUDE_CODE.TOC_WINDOWS"),
        url: "#windows-graphical-guide",
        depth: 3,
      },
      {
        title: t("DOCS.CLAUDE_CODE.TOC_MACOS"),
        url: "#macos-graphical-guide",
        depth: 3,
      },
      {
        title: t("DOCS.CLAUDE_CODE.TOC_LINUX"),
        url: "#linux-graphical-guide",
        depth: 3,
      },
    ],
    t("DOCS.TOC_TITLE"),
  );

  const setupScriptBash = `${process.env.NEXT_PUBLIC_APP_URL}/scripts/claude-cli-setup.sh`;
  const setupScriptPowershell = `${process.env.NEXT_PUBLIC_APP_URL}/scripts/claude-cli-setup.ps1`;
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

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {t("DOCS.CLAUDE_CODE.BADGE")}
          </Badge>
        </div>

        <h1 className="mt-4 text-4xl font-bold">
          {t("DOCS.CLAUDE_CODE.TITLE")}
        </h1>
        <p className="text-muted-foreground mt-4 text-lg">
          {t("DOCS.CLAUDE_CODE.SUBTITLE", APP_VALUES)}
        </p>

        {/* Project Introduction */}
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

        {/* Demo Section */}
        <section className="mt-12" id="demo">
          <h2 className="mb-4 text-2xl font-semibold">
            {t("DOCS.CLAUDE_CODE.DEMO_TITLE")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("DOCS.CLAUDE_CODE.DEMO_DESC", APP_VALUES)}
          </p>

          <Image
            src="/assets/docs/claude_code/introduce-01.webp"
            alt={t("DOCS.CLAUDE_CODE.DEMO_ALT1")}
            width={800}
            height={450}
            className="my-4 rounded-lg border"
            unoptimized
          />
          <Image
            src="/assets/docs/claude_code/introduce-02.webp"
            alt={t("DOCS.CLAUDE_CODE.DEMO_ALT2")}
            width={800}
            height={450}
            className="my-4 rounded-lg border"
            unoptimized
          />
        </section>

        {/* Features Section */}
        <section className="mt-12" id="features">
          <h2 className="mb-4 text-2xl font-semibold">
            {t("DOCS.CLAUDE_CODE.FEATURES_TITLE")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("DOCS.CLAUDE_CODE.FEATURES_DESC")}
          </p>

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

        {/* AI Model Configuration Method */}
        <section className="mt-12" id="ai-model-configuration">
          <h2 className="mb-4 text-2xl font-semibold">
            {t("DOCS.CLAUDE_CODE.CONFIG_TITLE")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t("DOCS.CLAUDE_CODE.CONFIG_DESC", APP_VALUES)}
          </p>

          {/* WINDOWS GUIDE */}
          <div className="mt-10" id="windows-graphical-guide">
            <h3 className="mb-4 text-xl font-semibold">
              {t("DOCS.CLAUDE_CODE.WIN_TITLE")}
            </h3>

            <h4 className="mt-6 mb-2 text-lg font-medium">
              {t("DOCS.CLAUDE_CODE.WIN_STEP1_TITLE")}
            </h4>
            <p className="text-muted-foreground mb-4">
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

            <Image
              src="/assets/docs/claude_code/windows-img-01.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP1_ALT1")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-02.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP1_ALT2")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-03.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP1_ALT3")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            <h4 className="mt-8 mb-2 text-lg font-medium">
              {t("DOCS.CLAUDE_CODE.WIN_STEP2_TITLE")}
            </h4>
            <p className="text-muted-foreground mb-4">
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

            <Image
              src="/assets/docs/claude_code/windows-img-04.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP2_ALT1")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-05.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP2_ALT2")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            <h4 className="mt-8 mb-2 text-lg font-medium">
              {t("DOCS.CLAUDE_CODE.WIN_STEP3_TITLE")}
            </h4>
            <p className="text-muted-foreground mb-4">
              {t("DOCS.CLAUDE_CODE.WIN_STEP3_DESC")}
            </p>
            <CodeBlock
              language="bash"
              code="npm install -g @anthropic-ai/claude-code"
            />

            <Image
              src="/assets/docs/claude_code/windows-img-06.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP3_ALT1")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-07.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP3_ALT2")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            <h4 className="mt-8 mb-2 text-lg font-medium">
              {t("DOCS.CLAUDE_CODE.WIN_STEP4_TITLE")}
            </h4>
            <p className="text-muted-foreground mb-4">
              {t("DOCS.CLAUDE_CODE.WIN_STEP4_DESC", APP_VALUES)}
            </p>

            <Callout type="info" title={t("DOCS.CLAUDE_CODE.AUTOMATED_SETUP")}>
              <p>{t("DOCS.CLAUDE_CODE.AUTOMATED_SETUP_DESC")}</p>
            </Callout>

            <p className="text-muted-foreground mt-4 mb-2 font-medium">
              {t("DOCS.CLAUDE_CODE.POWERSHELL_LABEL")}
            </p>
            <CodeBlock
              language="powershell"
              code={`irm ${setupScriptPowershell} | iex`}
            />

            <p className="text-muted-foreground mt-4 mb-2 font-medium">
              {t("DOCS.CLAUDE_CODE.GIT_BASH_LABEL")}
            </p>
            <CodeBlock
              language="bash"
              code={`curl -fsSL ${setupScriptBash} | bash`}
            />

            <p className="text-muted-foreground mt-4 mb-2 font-medium">
              {t("DOCS.CLAUDE_CODE.MANUAL_SETUP")}
            </p>
            <CodeBlock
              language="bash"
              code={`# Add to your ~/.bashrc or ~/.bash_profile
export ANTHROPIC_BASE_URL="${apiUrl}"
export ANTHROPIC_API_KEY="your-api-key-here"`}
            />

            <Image
              src="/assets/docs/claude_code/windows-img-08.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP4_ALT1")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-09.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP4_ALT2")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows_configure.png"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP4_ALT3")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-11.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP4_ALT4")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            <h4 className="mt-8 mb-2 text-lg font-medium">
              {t("DOCS.CLAUDE_CODE.WIN_STEP5_TITLE")}
            </h4>
            <p className="text-muted-foreground mb-4">
              {t("DOCS.CLAUDE_CODE.WIN_STEP5_DESC")}
            </p>
            <CodeBlock
              language="bash"
              code={`cd /path/to/your/project\nclaude`}
            />

            <Image
              src="/assets/docs/claude_code/windows-img-12.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP5_ALT1")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-13.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP5_ALT2")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-14.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP5_ALT3")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-15.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP5_ALT4")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-16.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP5_ALT5")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-17.webp"
              alt={t("DOCS.CLAUDE_CODE.WIN_STEP5_ALT6")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
          </div>

          {/* macOS GUIDE */}
          <div className="mt-14" id="macos-graphical-guide">
            <h3 className="mb-4 text-xl font-semibold">
              {t("DOCS.CLAUDE_CODE.MAC_TITLE")}
            </h3>

            <h4 className="mt-6 mb-2 text-lg font-medium">
              {t("DOCS.CLAUDE_CODE.MAC_STEP1_TITLE")}
            </h4>
            <p className="text-muted-foreground mb-4">
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
              code={`# Install Node.js via Homebrew (if needed)
brew install node

# Install Claude Code
npm install -g @anthropic-ai/claude-code`}
            />

            <Image
              src="/assets/docs/claude_code/macos-img-01.webp"
              alt={t("DOCS.CLAUDE_CODE.MAC_STEP1_ALT1")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos-img-02.webp"
              alt={t("DOCS.CLAUDE_CODE.MAC_STEP1_ALT2")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            <h4 className="mt-8 mb-2 text-lg font-medium">
              {t("DOCS.CLAUDE_CODE.MAC_STEP2_TITLE")}
            </h4>
            <p className="text-muted-foreground mb-4">
              {t("DOCS.CLAUDE_CODE.MAC_STEP2_DESC", APP_VALUES)}
            </p>

            <Callout type="info" title={t("DOCS.CLAUDE_CODE.AUTOMATED_SETUP")}>
              <p>{t("DOCS.CLAUDE_CODE.AUTOMATED_SETUP_RUN")}</p>
            </Callout>
            <CodeBlock
              language="bash"
              code={`curl -fsSL ${setupScriptBash} | bash`}
            />

            <p className="text-muted-foreground mt-4 mb-2 font-medium">
              {t("DOCS.CLAUDE_CODE.MANUAL_SETUP_SHELL")}
            </p>
            <CodeBlock
              language="bash"
              code={`# Add to your ~/.zshrc or ~/.bashrc
export ANTHROPIC_BASE_URL="${apiUrl}"
export ANTHROPIC_API_KEY="your-api-key-here"

# Reload your shell
source ~/.zshrc`}
            />

            <Image
              src="/assets/docs/claude_code/macos-img-04.webp"
              alt={t("DOCS.CLAUDE_CODE.MAC_STEP2_ALT1")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos-img-05.webp"
              alt={t("DOCS.CLAUDE_CODE.MAC_STEP2_ALT2")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos_configure.png"
              alt={t("DOCS.CLAUDE_CODE.MAC_STEP2_ALT3")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            <h4 className="mt-8 mb-2 text-lg font-medium">
              {t("DOCS.CLAUDE_CODE.MAC_STEP3_TITLE")}
            </h4>
            <p className="text-muted-foreground mb-4">
              {t("DOCS.CLAUDE_CODE.MAC_STEP3_DESC")}
            </p>
            <CodeBlock
              language="bash"
              code={`cd /path/to/your/project\nclaude`}
            />

            <Image
              src="/assets/docs/claude_code/macos-img-06.webp"
              alt={t("DOCS.CLAUDE_CODE.MAC_STEP3_ALT1")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos-img-07.webp"
              alt={t("DOCS.CLAUDE_CODE.MAC_STEP3_ALT2")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos-img-08.webp"
              alt={t("DOCS.CLAUDE_CODE.MAC_STEP3_ALT3")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos-img-09.webp"
              alt={t("DOCS.CLAUDE_CODE.MAC_STEP3_ALT4")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            <h4 className="mt-8 mb-2 text-lg font-medium">
              {t("DOCS.CLAUDE_CODE.MAC_ISSUES_TITLE")}
            </h4>

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

            <Callout
              type="warn"
              title={t("DOCS.CLAUDE_CODE.MAC_ISSUE_NODE_TITLE")}
            >
              <p>
                {t("DOCS.CLAUDE_CODE.MAC_ISSUE_NODE_DESC", {
                  checkCmd: "node --version",
                  updateCmd: "brew upgrade node",
                })}
              </p>
            </Callout>

            <Image
              src="/assets/docs/claude_code/macos-img-10.webp"
              alt={t("DOCS.CLAUDE_CODE.MAC_ISSUES_ALT1")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos-img-11.webp"
              alt={t("DOCS.CLAUDE_CODE.MAC_ISSUES_ALT2")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
          </div>

          {/* LINUX GUIDE */}
          <div className="mt-14" id="linux-graphical-guide">
            <h3 className="mb-4 text-xl font-semibold">
              {t("DOCS.CLAUDE_CODE.LINUX_TITLE")}
            </h3>

            <h4 className="mt-6 mb-2 text-lg font-medium">
              {t("DOCS.CLAUDE_CODE.LINUX_STEP1_TITLE")}
            </h4>
            <p className="text-muted-foreground mb-4">
              {t("DOCS.CLAUDE_CODE.LINUX_STEP1_DESC")}
            </p>
            <CodeBlock
              language="bash"
              code={`# Install Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install --lts

# Install Claude Code
npm install -g @anthropic-ai/claude-code`}
            />

            <Image
              src="/assets/docs/claude_code/linux-img-01.webp"
              alt={t("DOCS.CLAUDE_CODE.LINUX_STEP1_ALT")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            <h4 className="mt-8 mb-2 text-lg font-medium">
              {t("DOCS.CLAUDE_CODE.LINUX_STEP2_TITLE")}
            </h4>
            <p className="text-muted-foreground mb-4">
              {t("DOCS.CLAUDE_CODE.LINUX_STEP2_DESC", APP_VALUES)}
            </p>

            <Callout type="info" title={t("DOCS.CLAUDE_CODE.AUTOMATED_SETUP")}>
              <p>{t("DOCS.CLAUDE_CODE.AUTOMATED_SETUP_RUN")}</p>
            </Callout>
            <CodeBlock
              language="bash"
              code={`curl -fsSL ${setupScriptBash} | bash`}
            />

            <p className="text-muted-foreground mt-4 mb-2 font-medium">
              {t("DOCS.CLAUDE_CODE.MANUAL_SETUP_SHORT")}
            </p>
            <CodeBlock
              language="bash"
              code={`# Add to your ~/.bashrc or ~/.zshrc
export ANTHROPIC_BASE_URL="${apiUrl}"
export ANTHROPIC_API_KEY="your-api-key-here"

# Reload your shell
source ~/.bashrc`}
            />

            <Image
              src="/assets/docs/claude_code/linux-img-03.webp"
              alt={t("DOCS.CLAUDE_CODE.LINUX_STEP2_ALT1")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/linux-img-04.webp"
              alt={t("DOCS.CLAUDE_CODE.LINUX_STEP2_ALT2")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            <h4 className="mt-8 mb-2 text-lg font-medium">
              {t("DOCS.CLAUDE_CODE.LINUX_STEP3_TITLE")}
            </h4>
            <p className="text-muted-foreground mb-4">
              {t("DOCS.CLAUDE_CODE.LINUX_STEP3_DESC")}
            </p>
            <CodeBlock
              language="bash"
              code={`cd /path/to/your/project\nclaude`}
            />

            <Image
              src="/assets/docs/claude_code/linux-img-05.webp"
              alt={t("DOCS.CLAUDE_CODE.LINUX_STEP3_ALT1")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/linux-img-06.webp"
              alt={t("DOCS.CLAUDE_CODE.LINUX_STEP3_ALT2")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/linux-img-07.webp"
              alt={t("DOCS.CLAUDE_CODE.LINUX_STEP3_ALT3")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/linux-img-08.webp"
              alt={t("DOCS.CLAUDE_CODE.LINUX_STEP3_ALT4")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            <h4 className="mt-8 mb-2 text-lg font-medium">
              {t("DOCS.CLAUDE_CODE.LINUX_ISSUES_TITLE")}
            </h4>

            <Callout
              type="warn"
              title={t("DOCS.CLAUDE_CODE.LINUX_ISSUE_PERMISSION_TITLE")}
            >
              <p>
                {t("DOCS.CLAUDE_CODE.LINUX_ISSUE_PERMISSION_DESC", {
                  code: "EACCES",
                })}
              </p>
              <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 text-xs">
                {`mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc`}
              </pre>
            </Callout>

            <Callout
              type="warn"
              title={t("DOCS.CLAUDE_CODE.LINUX_ISSUE_BUILD_TITLE")}
            >
              <p>{t("DOCS.CLAUDE_CODE.LINUX_ISSUE_BUILD_DESC")}</p>
              <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 text-xs">
                sudo apt-get install -y build-essential
              </pre>
            </Callout>

            <Image
              src="/assets/docs/claude_code/linux-img-09.webp"
              alt={t("DOCS.CLAUDE_CODE.LINUX_ISSUES_ALT")}
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
          </div>
        </section>

        {/* CTA Section */}
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
