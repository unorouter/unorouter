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
import Image from "next/image";
import type { TOCItemType } from "fumadocs-core/toc";

const tocItems: TOCItemType[] = [
  { title: "Demo", url: "#demo", depth: 2 },
  { title: "Features", url: "#features", depth: 2 },
  { title: "AI Model Configuration", url: "#ai-model-configuration", depth: 2 },
  { title: "Windows Guide", url: "#windows-graphical-guide", depth: 3 },
  { title: "macOS Guide", url: "#macos-graphical-guide", depth: 3 },
  { title: "Linux Guide", url: "#linux-graphical-guide", depth: 3 },
];

const toc = createTOC(tocItems, "On this page");

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("DOCS.CLAUDE_CODE.META.TITLE", APP_VALUES),
    description: t("DOCS.CLAUDE_CODE.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.CLAUDE_CODE.META.KEYWORDS", APP_VALUES),
  });
}

export default async function ClaudeCodePage() {
  const t = await getTranslations();

  const setupScriptBash = `${process.env.NEXT_PUBLIC_APP_URL}/scripts/claude-cli-setup.sh`;
  const setupScriptPowershell = `${process.env.NEXT_PUBLIC_APP_URL}/scripts/claude-cli-setup.ps1`;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

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
        <Callout type="info" title="About Claude Code">
          <p>
            Claude Code is Anthropic&apos;s official agentic coding tool that
            lives in your terminal. It understands your entire codebase, can edit
            files, run commands, search the web, and interact with external
            tools. Visit the{" "}
            <a
              href="https://docs.anthropic.com/en/docs/claude-code/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              official Claude Code documentation
            </a>{" "}
            for more details.
          </p>
        </Callout>

        {/* Demo Section */}
        <section className="mt-12" id="demo">
          <h2 className="mb-4 text-2xl font-semibold">Demo</h2>
          <p className="text-muted-foreground mb-6">
            Here is what Claude Code looks like in action, powered by{" "}
            {APP_VALUES.appName}.
          </p>

          <Image
            src="/assets/docs/claude_code/introduce-01.webp"
            alt="Claude Code introduction screenshot 1"
            width={800}
            height={450}
            className="my-4 rounded-lg border"
            unoptimized
          />
          <Image
            src="/assets/docs/claude_code/introduce-02.webp"
            alt="Claude Code introduction screenshot 2"
            width={800}
            height={450}
            className="my-4 rounded-lg border"
            unoptimized
          />
        </section>

        {/* Features Section */}
        <section className="mt-12" id="features">
          <h2 className="mb-4 text-2xl font-semibold">Features</h2>
          <p className="text-muted-foreground mb-6">
            Key features and capabilities of Claude Code.
          </p>

          <div className="overflow-x-auto">
            <table className="border-border w-full border-collapse text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="text-muted-foreground px-4 py-3 text-left font-semibold">
                    Feature
                  </th>
                  <th className="text-muted-foreground px-4 py-3 text-left font-semibold">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Agentic Coding
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    Claude Code operates as an autonomous agent: it reads your
                    codebase, edits files, creates new ones, runs shell commands,
                    and iterates until the task is complete.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Full Codebase Context
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    Understands your entire project structure, dependencies, and
                    conventions. No need to manually select files or provide
                    context.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Terminal Native
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    Runs directly in your terminal with no IDE plugin required.
                    Works with any editor, any workflow, any language.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Git Integration
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    Creates commits, manages branches, resolves merge conflicts,
                    and creates pull requests. Built to work with your existing
                    Git workflow.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Tool Use &amp; MCP
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    Supports Model Context Protocol (MCP) servers, allowing
                    integration with databases, APIs, browsers, and other
                    external tools.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Multi-model Support
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    Works with all Claude models (Opus, Sonnet, Haiku) through{" "}
                    {APP_VALUES.appName}. Switch models on the fly with{" "}
                    <code className="bg-muted rounded px-1 text-xs">
                      /model
                    </code>{" "}
                    command.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Extended Thinking
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    Supports extended thinking mode for complex reasoning tasks.
                    Claude thinks through problems step by step before
                    responding.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Image &amp; File Input
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    Drag and drop images or paste screenshots directly into the
                    terminal. Supports reading PDFs, CSVs, and other file
                    formats.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">
                    Safe by Default
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    Asks for permission before running potentially destructive
                    commands. Configurable permission levels for automated
                    workflows.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* AI Model Configuration Method */}
        <section className="mt-12" id="ai-model-configuration">
          <h2 className="mb-4 text-2xl font-semibold">
            AI Model Configuration Method
          </h2>
          <p className="text-muted-foreground mb-6">
            Follow the guide for your operating system to install Claude Code
            and configure it with {APP_VALUES.appName}.
          </p>

          {/* ============================================ */}
          {/* WINDOWS GUIDE                                */}
          {/* ============================================ */}
          <div className="mt-10" id="windows-graphical-guide">
            <h3 className="mb-4 text-xl font-semibold">
              Windows Graphical Guide
            </h3>

            {/* Step 1: Install Node.js */}
            <h4 className="mt-6 mb-2 text-lg font-medium">
              Step 1: Install Node.js
            </h4>
            <p className="text-muted-foreground mb-4">
              Claude Code requires Node.js 18 or later. Download and install it
              from{" "}
              <a
                href="https://nodejs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                nodejs.org
              </a>
              . Choose the LTS version for stability.
            </p>

            <Image
              src="/assets/docs/claude_code/windows-img-01.webp"
              alt="Windows Node.js download page"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-02.webp"
              alt="Windows Node.js installer"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-03.webp"
              alt="Windows Node.js installation progress"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            {/* Step 2: Install Git Bash */}
            <h4 className="mt-8 mb-2 text-lg font-medium">
              Step 2: Install Git Bash
            </h4>
            <p className="text-muted-foreground mb-4">
              Claude Code runs best in a Unix-like shell. Install Git for
              Windows which includes Git Bash. Download from{" "}
              <a
                href="https://git-scm.com/downloads/win"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                git-scm.com
              </a>
              .
            </p>

            <Image
              src="/assets/docs/claude_code/windows-img-04.webp"
              alt="Git for Windows download page"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-05.webp"
              alt="Git for Windows installer"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            {/* Step 3: Install Claude Code */}
            <h4 className="mt-8 mb-2 text-lg font-medium">
              Step 3: Install Claude Code
            </h4>
            <p className="text-muted-foreground mb-4">
              Open Git Bash and install Claude Code globally via npm:
            </p>

            <CodeBlock
              language="bash"
              code="npm install -g @anthropic-ai/claude-code"
            />

            <Image
              src="/assets/docs/claude_code/windows-img-06.webp"
              alt="Installing Claude Code via npm in Git Bash"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-07.webp"
              alt="Claude Code npm installation complete"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            {/* Step 4: Set Environment Variables */}
            <h4 className="mt-8 mb-2 text-lg font-medium">
              Step 4: Set Environment Variables
            </h4>
            <p className="text-muted-foreground mb-4">
              Configure Claude Code to use {APP_VALUES.appName} as the API
              provider. You can set environment variables in your system
              settings, or use the automated setup script.
            </p>

            <Callout type="info" title="Automated Setup">
              <p>
                Use the setup script to configure everything automatically:
              </p>
            </Callout>

            <p className="text-muted-foreground mt-4 mb-2 font-medium">
              PowerShell (recommended for Windows):
            </p>
            <CodeBlock
              language="powershell"
              code={`irm ${setupScriptPowershell} | iex`}
            />

            <p className="text-muted-foreground mt-4 mb-2 font-medium">
              Git Bash:
            </p>
            <CodeBlock
              language="bash"
              code={`curl -fsSL ${setupScriptBash} | bash`}
            />

            <p className="text-muted-foreground mt-4 mb-2 font-medium">
              Or set the environment variables manually:
            </p>
            <CodeBlock
              language="bash"
              code={`# Add to your ~/.bashrc or ~/.bash_profile
export ANTHROPIC_BASE_URL="${apiUrl}"
export ANTHROPIC_API_KEY="your-api-key-here"`}
            />

            <Image
              src="/assets/docs/claude_code/windows-img-08.webp"
              alt="Windows environment variable configuration"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-09.webp"
              alt="Windows system environment variables dialog"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows_configure.png"
              alt="Windows Claude Code configuration"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-11.webp"
              alt="Windows environment variables set"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            {/* Step 5: Usage */}
            <h4 className="mt-8 mb-2 text-lg font-medium">
              Step 5: Start Using Claude Code
            </h4>
            <p className="text-muted-foreground mb-4">
              Navigate to your project directory and launch Claude Code:
            </p>

            <CodeBlock
              language="bash"
              code={`cd /path/to/your/project
claude`}
            />

            <Image
              src="/assets/docs/claude_code/windows-img-12.webp"
              alt="Launching Claude Code in Git Bash"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-13.webp"
              alt="Claude Code running on Windows"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-14.webp"
              alt="Claude Code working with a project on Windows"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-15.webp"
              alt="Claude Code generating code on Windows"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-16.webp"
              alt="Claude Code completing a task on Windows"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/windows-img-17.webp"
              alt="Claude Code output on Windows"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
          </div>

          {/* ============================================ */}
          {/* macOS GUIDE                                  */}
          {/* ============================================ */}
          <div className="mt-14" id="macos-graphical-guide">
            <h3 className="mb-4 text-xl font-semibold">
              macOS Graphical Guide
            </h3>

            {/* Step 1: Install Claude Code */}
            <h4 className="mt-6 mb-2 text-lg font-medium">
              Step 1: Install Claude Code CLI
            </h4>
            <p className="text-muted-foreground mb-4">
              Open Terminal and install Claude Code via npm. If you do not have
              Node.js installed, install it first using{" "}
              <a
                href="https://brew.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Homebrew
              </a>
              :
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
              alt="macOS Terminal installing Claude Code"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos-img-02.webp"
              alt="macOS Claude Code installation complete"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            {/* Step 2: Set Environment Variables */}
            <h4 className="mt-8 mb-2 text-lg font-medium">
              Step 2: Set Environment Variables
            </h4>
            <p className="text-muted-foreground mb-4">
              Configure the API endpoint and key for {APP_VALUES.appName}. Use
              the automated setup script or set the variables manually.
            </p>

            <Callout type="info" title="Automated Setup">
              <p>Run the setup script for quick configuration:</p>
            </Callout>

            <CodeBlock
              language="bash"
              code={`curl -fsSL ${setupScriptBash} | bash`}
            />

            <p className="text-muted-foreground mt-4 mb-2 font-medium">
              Or set manually in your shell profile:
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
              alt="macOS setting environment variables"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos-img-05.webp"
              alt="macOS environment variables configured"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos_configure.png"
              alt="macOS Claude Code configuration"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            {/* Step 3: Usage */}
            <h4 className="mt-8 mb-2 text-lg font-medium">
              Step 3: Start Using Claude Code
            </h4>
            <p className="text-muted-foreground mb-4">
              Navigate to your project and start Claude Code:
            </p>

            <CodeBlock
              language="bash"
              code={`cd /path/to/your/project
claude`}
            />

            <Image
              src="/assets/docs/claude_code/macos-img-06.webp"
              alt="Launching Claude Code on macOS"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos-img-07.webp"
              alt="Claude Code running on macOS"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos-img-08.webp"
              alt="Claude Code interacting with a project on macOS"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos-img-09.webp"
              alt="Claude Code generating output on macOS"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            {/* Common Issues */}
            <h4 className="mt-8 mb-2 text-lg font-medium">
              Common Issues on macOS
            </h4>

            <Callout type="warn" title="Permission Denied">
              <p>
                If you see <code className="bg-muted rounded px-1 text-xs">EACCES</code>{" "}
                errors when installing globally, fix npm permissions:
              </p>
              <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 text-xs">
                {`mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc`}
              </pre>
            </Callout>

            <Callout type="warn" title="Node.js Version">
              <p>
                Claude Code requires Node.js 18 or later. Check your version
                with{" "}
                <code className="bg-muted rounded px-1 text-xs">
                  node --version
                </code>
                . Update via Homebrew:{" "}
                <code className="bg-muted rounded px-1 text-xs">
                  brew upgrade node
                </code>
                .
              </p>
            </Callout>

            <Image
              src="/assets/docs/claude_code/macos-img-10.webp"
              alt="macOS Claude Code troubleshooting"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/macos-img-11.webp"
              alt="macOS Claude Code resolved"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
          </div>

          {/* ============================================ */}
          {/* LINUX GUIDE                                  */}
          {/* ============================================ */}
          <div className="mt-14" id="linux-graphical-guide">
            <h3 className="mb-4 text-xl font-semibold">
              Linux Graphical Guide
            </h3>

            {/* Step 1: Install */}
            <h4 className="mt-6 mb-2 text-lg font-medium">
              Step 1: Install Claude Code
            </h4>
            <p className="text-muted-foreground mb-4">
              Open your terminal and install Claude Code. Make sure Node.js 18+
              is installed first.
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
              alt="Linux terminal installing Claude Code"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            {/* Step 2: Set Environment Variables */}
            <h4 className="mt-8 mb-2 text-lg font-medium">
              Step 2: Set Environment Variables
            </h4>
            <p className="text-muted-foreground mb-4">
              Configure the API endpoint and key for {APP_VALUES.appName}.
            </p>

            <Callout type="info" title="Automated Setup">
              <p>Run the setup script for quick configuration:</p>
            </Callout>

            <CodeBlock
              language="bash"
              code={`curl -fsSL ${setupScriptBash} | bash`}
            />

            <p className="text-muted-foreground mt-4 mb-2 font-medium">
              Or set manually:
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
              alt="Linux setting environment variables"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/linux-img-04.webp"
              alt="Linux environment variables configured"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            {/* Step 3: Usage */}
            <h4 className="mt-8 mb-2 text-lg font-medium">
              Step 3: Start Using Claude Code
            </h4>
            <p className="text-muted-foreground mb-4">
              Navigate to your project and launch Claude Code:
            </p>

            <CodeBlock
              language="bash"
              code={`cd /path/to/your/project
claude`}
            />

            <Image
              src="/assets/docs/claude_code/linux-img-05.webp"
              alt="Launching Claude Code on Linux"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/linux-img-06.webp"
              alt="Claude Code running on Linux"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/linux-img-07.webp"
              alt="Claude Code interacting with a project on Linux"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />
            <Image
              src="/assets/docs/claude_code/linux-img-08.webp"
              alt="Claude Code generating output on Linux"
              width={800}
              height={450}
              className="my-4 rounded-lg border"
              unoptimized
            />

            {/* Common Issues */}
            <h4 className="mt-8 mb-2 text-lg font-medium">
              Common Issues on Linux
            </h4>

            <Callout type="warn" title="Permission Denied">
              <p>
                If you see <code className="bg-muted rounded px-1 text-xs">EACCES</code>{" "}
                errors when installing globally, fix npm permissions:
              </p>
              <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 text-xs">
                {`mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc`}
              </pre>
            </Callout>

            <Callout type="warn" title="Missing Build Tools">
              <p>
                On some Linux distributions you may need build essentials:
              </p>
              <pre className="bg-muted mt-2 overflow-x-auto rounded p-2 text-xs">
                sudo apt-get install -y build-essential
              </pre>
            </Callout>

            <Image
              src="/assets/docs/claude_code/linux-img-09.webp"
              alt="Linux Claude Code troubleshooting and common issues"
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
