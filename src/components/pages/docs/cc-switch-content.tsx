import { APP_VALUES } from "@/lib/config/constants";
import { PageHeader } from "@/components/elements/content/page-header";
import { Button } from "@/components/ui/button";
import { GetStartedButton } from "@/components/elements/brand/get-started-link";
import { CodeBlock } from "@/components/elements/code/code-block";
import { Callout } from "@/components/elements/content/callout";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { LuArrowLeftRight } from "react-icons/lu";
import { OSTabs } from "./os-tabs";
import { CCSwitchDeepLinks } from "./cc-switch-deep-links";
import { getDocsApiKey } from "@/lib/utils/server";

export async function CCSwitchContent() {
  const t = await getTranslations();
  const docs = await getDocsApiKey();

  const toc = createTOC(
    [
      { title: t("DOCS.CC_SWITCH.TOC_FEATURES"), url: "#features", depth: 2 },
      {
        title: t("DOCS.CC_SWITCH.TOC_PROVIDER_MGMT"),
        url: "#provider-management",
        depth: 3,
      },
      {
        title: t("DOCS.CC_SWITCH.TOC_MCP_MGMT"),
        url: "#mcp-server-management",
        depth: 3,
      },
      {
        title: t("DOCS.CC_SWITCH.TOC_PROMPTS_MGMT"),
        url: "#prompts-management",
        depth: 3,
      },
      {
        title: t("DOCS.CC_SWITCH.TOC_MULTI_PLATFORM"),
        url: "#multi-platform-support",
        depth: 3,
      },
      {
        title: t("DOCS.CC_SWITCH.TOC_INSTALLATION"),
        url: "#installation",
        depth: 2,
      },
      {
        title: t("DOCS.CC_SWITCH.TOC_INTEGRATION", APP_VALUES),
        url: "#integration",
        depth: 2,
      },
    ],
    t("DOCS.TOC_TITLE"),
  );

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <PageHeader
          badge={t("DOCS.CC_SWITCH.BADGE")}
          badgeIcon={LuArrowLeftRight}
          title={t("DOCS.CC_SWITCH.TITLE")}
          subtitle={t("DOCS.CC_SWITCH.SUBTITLE")}
          centered
        />

        {/* Project Intro */}
        <Callout type="info" title={t("DOCS.CC_SWITCH.INTRO_TITLE")}>
          <p>{t("DOCS.CC_SWITCH.INTRO_DESC")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              <a
                href="https://github.com/farion1231/cc-switch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                GitHub
              </a>
            </li>
          </ul>
        </Callout>

        {/* Features */}
        <section className="mt-12">
          <h2 className="mb-6 text-2xl font-semibold" id="features">
            {t("DOCS.CC_SWITCH.FEATURES")}
          </h2>

          {/* Provider Management */}
          <h3 className="mb-3 text-lg font-medium" id="provider-management">
            {t("DOCS.CC_SWITCH.PROVIDER_MANAGEMENT")}
          </h3>
          <ul className="text-muted-foreground mb-6 space-y-2 text-sm">
            <li>{t("DOCS.CC_SWITCH.PROVIDER_ONE_CLICK")}</li>
            <li>{t("DOCS.CC_SWITCH.PROVIDER_MULTI_ENDPOINT")}</li>
            <li>{t("DOCS.CC_SWITCH.PROVIDER_MODEL_CONFIG")}</li>
          </ul>

          {/* MCP Server Management */}
          <h3 className="mb-3 text-lg font-medium" id="mcp-server-management">
            {t("DOCS.CC_SWITCH.MCP_MANAGEMENT")}
          </h3>
          <ul className="text-muted-foreground mb-6 space-y-2 text-sm">
            <li>{t("DOCS.CC_SWITCH.MCP_UNIFIED")}</li>
            <li>{t("DOCS.CC_SWITCH.MCP_TRANSPORT_TYPES")}</li>
            <li>{t("DOCS.CC_SWITCH.MCP_IMPORT_EXPORT")}</li>
          </ul>

          {/* Prompts Management */}
          <h3 className="mb-3 text-lg font-medium" id="prompts-management">
            {t("DOCS.CC_SWITCH.PROMPTS_MANAGEMENT")}
          </h3>
          <ul className="text-muted-foreground mb-6 space-y-2 text-sm">
            <li>{t("DOCS.CC_SWITCH.PROMPTS_UNLIMITED")}</li>
            <li>{t("DOCS.CC_SWITCH.PROMPTS_CROSS_APP")}</li>
            <li>{t("DOCS.CC_SWITCH.PROMPTS_EDITOR")}</li>
          </ul>

          {/* Multi-Platform Support */}
          <h3 className="mb-3 text-lg font-medium" id="multi-platform-support">
            {t("DOCS.CC_SWITCH.MULTI_PLATFORM")}
          </h3>
          <ul className="text-muted-foreground mb-6 space-y-2 text-sm">
            <li>{t("DOCS.CC_SWITCH.PLATFORM_DESKTOP")}</li>
            <li>{t("DOCS.CC_SWITCH.PLATFORM_WEB")}</li>
            <li>{t("DOCS.CC_SWITCH.PLATFORM_CLI")}</li>
          </ul>
        </section>

        {/* Installation */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="installation">
            {t("DOCS.CC_SWITCH.INSTALLATION")}
          </h2>

          <OSTabs
            windowsContent={
              <div className="mt-6 space-y-4">
                <p className="text-muted-foreground text-sm">
                  {t("DOCS.CC_SWITCH.INSTALL_DOWNLOAD_DESC")}
                </p>
                <CodeBlock
                  language="bash"
                  code={`# Available formats: .msi, .zip
# Download from GitHub Releases:
# https://github.com/farion1231/cc-switch/releases`}
                />
              </div>
            }
            macosContent={
              <div className="mt-6">
                <CodeBlock
                  language="bash"
                  code={`brew tap farion1231/ccswitch
brew install --cask cc-switch`}
                />
              </div>
            }
            linuxContent={
              <div className="mt-6 space-y-4">
                <p className="text-muted-foreground text-sm">
                  {t("DOCS.CC_SWITCH.INSTALL_DOWNLOAD_DESC")}
                </p>
                <CodeBlock
                  language="bash"
                  code={`# Available formats: .deb, .AppImage
# Download from GitHub Releases:
# https://github.com/farion1231/cc-switch/releases`}
                />
              </div>
            }
            labels={{
              windows: t("DOCS.OS.WINDOWS"),
              macos: t("DOCS.OS.MACOS"),
              linux: t("DOCS.OS.LINUX"),
            }}
          />

          <h3 className="mt-6 mb-3 text-lg font-medium">
            {t("DOCS.CC_SWITCH.INSTALL_WEB_VERSION")}
          </h3>
          <CodeBlock
            language="bash"
            code={`# Download the Linux tarball from GitHub Releases
# Extract and run:
./cc-switch-web

# Accessible on port 17666`}
          />
        </section>

        {/* Integration */}
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold" id="integration">
            {t("DOCS.CC_SWITCH.INTEGRATION", APP_VALUES)}
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("DOCS.CC_SWITCH.INTEGRATION_DESC", APP_VALUES)}
          </p>
          <Callout type="info" title={t("DOCS.CC_SWITCH.DEEP_LINK_TITLE")}>
            <p>{t("DOCS.CC_SWITCH.DEEP_LINK_DESC", APP_VALUES)}</p>
          </Callout>

          <div className="mt-6">
            <CCSwitchDeepLinks
              apiUrl={docs.apiUrl}
              apps={[
                { label: "Claude Code", app: "claude", suffix: "" },
                { label: "Codex CLI", app: "codex", suffix: "/v1" },
                { label: "Gemini CLI", app: "gemini", suffix: "" },
                { label: "OpenClaw", app: "openclaw", suffix: "/v1" },
              ]}
              cliCodeBlock={
                <CodeBlock language="bash" code="cc-switch provider add" />
              }
            />
          </div>
        </section>

        {/* CTA */}
        <section className="border-border mt-16 border-t pt-12 text-center">
          <h2 className="text-2xl font-semibold">
            {t("DOCS.CC_SWITCH.CTA_TITLE")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t("DOCS.CC_SWITCH.CTA_DESC", APP_VALUES)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <GetStartedButton translationKey="DOCS.CC_SWITCH.CTA_SIGNUP" />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/models" />}
            >
              {t("DOCS.CC_SWITCH.CTA_MODELS")}
            </Button>
          </div>
        </section>
      </div>
    </TOCLayout>
  );
}
