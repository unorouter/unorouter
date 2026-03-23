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

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("DOCS.CODEX.META.TITLE", APP_VALUES),
    description: t("DOCS.CODEX.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.CODEX.META.KEYWORDS", APP_VALUES),
  });
}

export default async function CodexPage() {
  const t = await getTranslations();

  const toc = createTOC([
    { title: t("DOCS.CODEX.DEMO_TITLE"), url: "#demo", depth: 2 },
    { title: t("DOCS.CODEX.FEATURES_TITLE"), url: "#features", depth: 2 },
    {
      title: t("DOCS.CODEX.AI_CONFIG_TITLE"),
      url: "#ai-model-configuration",
      depth: 2,
    },
    {
      title: t("DOCS.CODEX.WINDOWS_TITLE"),
      url: "#windows-graphical-guide",
      depth: 3,
    },
    {
      title: t("DOCS.CODEX.MACOS_TITLE"),
      url: "#macos-graphical-guide",
      depth: 3,
    },
    {
      title: t("DOCS.CODEX.LINUX_TITLE"),
      url: "#linux-graphical-guide",
      depth: 3,
    },
  ]);

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {t("DOCS.CODEX.BADGE")}
          </Badge>
        </div>

        <h1 className="mt-4 text-4xl font-bold">{t("DOCS.CODEX.TITLE")}</h1>
        <p className="text-muted-foreground mt-4 text-lg">
          {t("DOCS.CODEX.SUBTITLE", APP_VALUES)}
        </p>

        {/* Project Intro Callout */}
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

        {/* Demo */}
        <section className="mt-12" id="demo">
          <h2 className="mb-4 text-2xl font-semibold">
            {t("DOCS.CODEX.DEMO_TITLE")}
          </h2>
          <Image
            src="/assets/docs/codex/introduce-01.webp"
            alt={t("DOCS.CODEX.DEMO_ALT")}
            width={800}
            height={450}
            className="my-4 rounded-lg border"
            unoptimized
          />
        </section>

        {/* Features */}
        <section className="mt-12" id="features">
          <h2 className="mb-6 text-2xl font-semibold">
            {t("DOCS.CODEX.FEATURES_TITLE")}
          </h2>
          <div className="border-border overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <tbody className="divide-border divide-y">
                <tr>
                  <td className="bg-muted/50 px-4 py-3 font-medium">
                    {t("DOCS.CODEX.FEATURES_TERMINAL_TITLE")}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {t("DOCS.CODEX.FEATURES_TERMINAL_DESC")}
                  </td>
                </tr>
                <tr>
                  <td className="bg-muted/50 px-4 py-3 font-medium">
                    {t("DOCS.CODEX.FEATURES_TOOL_TITLE")}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {t("DOCS.CODEX.FEATURES_TOOL_DESC")}
                  </td>
                </tr>
                <tr>
                  <td className="bg-muted/50 px-4 py-3 font-medium">
                    {t("DOCS.CODEX.FEATURES_PATCH_TITLE")}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {t("DOCS.CODEX.FEATURES_PATCH_DESC")}
                  </td>
                </tr>
                <tr>
                  <td className="bg-muted/50 px-4 py-3 font-medium">
                    {t("DOCS.CODEX.FEATURES_SANDBOX_TITLE")}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {t("DOCS.CODEX.FEATURES_SANDBOX_DESC")}
                  </td>
                </tr>
                <tr>
                  <td className="bg-muted/50 px-4 py-3 font-medium">
                    {t("DOCS.CODEX.FEATURES_PLAN_TITLE")}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {t("DOCS.CODEX.FEATURES_PLAN_DESC")}
                  </td>
                </tr>
                <tr>
                  <td className="bg-muted/50 px-4 py-3 font-medium">
                    {t("DOCS.CODEX.FEATURES_MULTIMODAL_TITLE")}
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {t("DOCS.CODEX.FEATURES_MULTIMODAL_DESC")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* AI Model Configuration */}
        <section className="mt-12" id="ai-model-configuration">
          <h2 className="mb-6 text-2xl font-semibold">
            {t("DOCS.CODEX.AI_CONFIG_TITLE")}
          </h2>

          {/* Windows Guide */}
          <div className="mt-8" id="windows-graphical-guide">
            <h3 className="mb-4 text-xl font-semibold">
              {t("DOCS.CODEX.WINDOWS_TITLE")}
            </h3>

            {/* Step 1: Open Terminal */}
            <div className="mt-6">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.WINDOWS_STEP1_TITLE")}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.WINDOWS_STEP1_DESC")}
              </p>
              <Image
                src="/assets/docs/codex/windows_open_terminal.png"
                alt={t("DOCS.CODEX.WINDOWS_STEP1_ALT")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>

            {/* Step 2: Install WSL */}
            <div className="mt-8">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.WINDOWS_STEP2_TITLE")}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.WINDOWS_STEP2_DESC")}
              </p>
              <CodeBlock language="powershell" code="wsl --install" />
              <Image
                src="/assets/docs/codex/windows-img-03.webp"
                alt={t("DOCS.CODEX.WINDOWS_STEP2_ALT1")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/windows-img-04.webp"
                alt={t("DOCS.CODEX.WINDOWS_STEP2_ALT2")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/windows-img-05.webp"
                alt={t("DOCS.CODEX.WINDOWS_STEP2_ALT3")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>

            {/* Step 3: Install Codex CLI */}
            <div className="mt-8">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.WINDOWS_STEP3_TITLE")}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.WINDOWS_STEP3_DESC")}
              </p>
              <CodeBlock language="bash" code="npm i -g @openai/codex" />
              <Image
                src="/assets/docs/codex/windows-img-06.webp"
                alt={t("DOCS.CODEX.WINDOWS_STEP3_ALT")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>

            {/* Step 4: Configure */}
            <div className="mt-8">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.WINDOWS_STEP4_TITLE", APP_VALUES)}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.WINDOWS_STEP4_DESC", APP_VALUES)}
              </p>
              <CodeBlock
                language="powershell"
                code={`irm ${process.env.NEXT_PUBLIC_APP_URL}/scripts/codex-cli-setup.ps1 | iex`}
              />
              <Image
                src="/assets/docs/codex/windows_configure.png"
                alt={t("DOCS.CODEX.WINDOWS_STEP4_ALT")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>

            {/* Step 5: Start Using */}
            <div className="mt-8">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.WINDOWS_STEP5_TITLE")}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.WINDOWS_STEP5_DESC")}
              </p>
              <CodeBlock language="bash" code="codex" />
              <Image
                src="/assets/docs/codex/windows-img-09.webp"
                alt={t("DOCS.CODEX.WINDOWS_STEP5_ALT1")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/windows-img-10.webp"
                alt={t("DOCS.CODEX.WINDOWS_STEP5_ALT2")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/windows-img-11.webp"
                alt={t("DOCS.CODEX.WINDOWS_STEP5_ALT3")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/windows-img-12.webp"
                alt={t("DOCS.CODEX.WINDOWS_STEP5_ALT4")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/windows-img-13.webp"
                alt={t("DOCS.CODEX.WINDOWS_STEP5_ALT5")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/windows-img-14.webp"
                alt={t("DOCS.CODEX.WINDOWS_STEP5_ALT6")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>
          </div>

          {/* macOS Guide */}
          <div
            className="border-border mt-12 border-t pt-8"
            id="macos-graphical-guide"
          >
            <h3 className="mb-4 text-xl font-semibold">
              {t("DOCS.CODEX.MACOS_TITLE")}
            </h3>

            {/* Step 1: Install Homebrew */}
            <div className="mt-6">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.MACOS_STEP1_TITLE")}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.MACOS_STEP1_DESC")}
              </p>
              <CodeBlock
                language="bash"
                code={
                  '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
                }
              />
              <Image
                src="/assets/docs/codex/macos-img-01.webp"
                alt={t("DOCS.CODEX.MACOS_STEP1_ALT1")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/macos-img-02.webp"
                alt={t("DOCS.CODEX.MACOS_STEP1_ALT2")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/macos-img-03.webp"
                alt={t("DOCS.CODEX.MACOS_STEP1_ALT3")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/macos-img-04.webp"
                alt={t("DOCS.CODEX.MACOS_STEP1_ALT4")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>

            {/* Step 2: Install Node.js */}
            <div className="mt-8">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.MACOS_STEP2_TITLE")}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.MACOS_STEP2_DESC")}
              </p>
              <CodeBlock
                language="bash"
                code={`brew update\nbrew install node`}
              />
              <Image
                src="/assets/docs/codex/macos-img-05.webp"
                alt={t("DOCS.CODEX.MACOS_STEP2_ALT1")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/macos-img-06.webp"
                alt={t("DOCS.CODEX.MACOS_STEP2_ALT2")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>

            {/* Step 3: Install Codex CLI */}
            <div className="mt-8">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.MACOS_STEP3_TITLE")}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.MACOS_STEP3_DESC")}
              </p>
              <CodeBlock language="bash" code="npm install -g @openai/codex" />
              <Image
                src="/assets/docs/codex/macos-img-07.webp"
                alt={t("DOCS.CODEX.MACOS_STEP3_ALT")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>

            {/* Step 4: Configure */}
            <div className="mt-8">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.MACOS_STEP4_TITLE", APP_VALUES)}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.MACOS_STEP4_DESC", APP_VALUES)}
              </p>
              <CodeBlock
                language="bash"
                code={`bash <(curl -fsSL ${process.env.NEXT_PUBLIC_APP_URL}/scripts/codex-cli-setup.sh)`}
              />
              <Image
                src="/assets/docs/codex/macos_configure.png"
                alt={t("DOCS.CODEX.MACOS_STEP4_ALT")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>

            {/* Step 5: Start Using */}
            <div className="mt-8">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.MACOS_STEP5_TITLE")}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.MACOS_STEP5_DESC")}
              </p>
              <CodeBlock language="bash" code="codex" />
              <Image
                src="/assets/docs/codex/macos-img-09.webp"
                alt={t("DOCS.CODEX.MACOS_STEP5_ALT1")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/macos-img-10.webp"
                alt={t("DOCS.CODEX.MACOS_STEP5_ALT2")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/macos-img-11.webp"
                alt={t("DOCS.CODEX.MACOS_STEP5_ALT3")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/macos-img-12.webp"
                alt={t("DOCS.CODEX.MACOS_STEP5_ALT4")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/macos-img-13.webp"
                alt={t("DOCS.CODEX.MACOS_STEP5_ALT5")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/macos-img-14.webp"
                alt={t("DOCS.CODEX.MACOS_STEP5_ALT6")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>

            {/* Common Issues */}
            <div className="mt-8">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.MACOS_ISSUES_TITLE")}
              </h4>
              <Callout type="warn" title={t("DOCS.CODEX.MACOS_ISSUES_TITLE")}>
                <ul className="list-disc space-y-2 pl-4">
                  <li>{t("DOCS.CODEX.MACOS_ISSUES_NODE")}</li>
                  <li>{t("DOCS.CODEX.MACOS_ISSUES_PERMISSION")}</li>
                </ul>
              </Callout>
            </div>
          </div>

          {/* Linux Guide */}
          <div
            className="border-border mt-12 border-t pt-8"
            id="linux-graphical-guide"
          >
            <h3 className="mb-4 text-xl font-semibold">
              {t("DOCS.CODEX.LINUX_TITLE")}
            </h3>

            {/* Step 1: Install Node.js */}
            <div className="mt-6">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.LINUX_STEP1_TITLE")}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.LINUX_STEP1_DESC")}
              </p>
              <CodeBlock
                language="bash"
                code={`curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -\nsudo apt-get install -y nodejs`}
              />
              <Image
                src="/assets/docs/codex/linux-img-01.webp"
                alt={t("DOCS.CODEX.LINUX_STEP1_ALT1")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/linux-img-02.webp"
                alt={t("DOCS.CODEX.LINUX_STEP1_ALT2")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>

            {/* Step 2: Install Codex CLI */}
            <div className="mt-8">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.LINUX_STEP2_TITLE")}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.LINUX_STEP2_DESC")}
              </p>
              <CodeBlock language="bash" code="npm install -g @openai/codex" />
              <Image
                src="/assets/docs/codex/linux-img-03.webp"
                alt={t("DOCS.CODEX.LINUX_STEP2_ALT")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>

            {/* Step 3: Configure */}
            <div className="mt-8">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.LINUX_STEP3_TITLE", APP_VALUES)}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.LINUX_STEP3_DESC", APP_VALUES)}
              </p>
              <CodeBlock
                language="bash"
                code={`bash <(curl -fsSL ${process.env.NEXT_PUBLIC_APP_URL}/scripts/codex-cli-setup.sh)`}
              />
              <Image
                src="/assets/docs/codex/macos_configure.png"
                alt={t("DOCS.CODEX.LINUX_STEP3_ALT")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>

            {/* Step 4: Start Using */}
            <div className="mt-8">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.LINUX_STEP4_TITLE")}
              </h4>
              <p className="text-muted-foreground mb-4 text-sm">
                {t("DOCS.CODEX.LINUX_STEP4_DESC")}
              </p>
              <CodeBlock language="bash" code="codex" />
              <Image
                src="/assets/docs/codex/linux-img-05.webp"
                alt={t("DOCS.CODEX.LINUX_STEP4_ALT1")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/linux-img-06.webp"
                alt={t("DOCS.CODEX.LINUX_STEP4_ALT2")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/linux-img-07.webp"
                alt={t("DOCS.CODEX.LINUX_STEP4_ALT3")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/linux-img-08.webp"
                alt={t("DOCS.CODEX.LINUX_STEP4_ALT4")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/linux-img-09.webp"
                alt={t("DOCS.CODEX.LINUX_STEP4_ALT5")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
              <Image
                src="/assets/docs/codex/linux-img-10.webp"
                alt={t("DOCS.CODEX.LINUX_STEP4_ALT6")}
                width={800}
                height={450}
                className="my-4 rounded-lg border"
                unoptimized
              />
            </div>

            {/* Common Issues */}
            <div className="mt-8">
              <h4 className="mb-2 text-lg font-medium">
                {t("DOCS.CODEX.LINUX_ISSUES_TITLE")}
              </h4>
              <Callout type="warn" title={t("DOCS.CODEX.LINUX_ISSUES_TITLE")}>
                <ul className="list-disc space-y-2 pl-4">
                  <li>{t("DOCS.CODEX.LINUX_ISSUES_NODE")}</li>
                  <li>{t("DOCS.CODEX.LINUX_ISSUES_PERMISSION")}</li>
                </ul>
              </Callout>
            </div>
          </div>
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
