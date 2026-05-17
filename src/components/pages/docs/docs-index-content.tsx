import { APP_VALUES } from "@/lib/config/constants";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/elements/content/page-header";
import { GetStartedButton } from "@/components/elements/brand/get-started-link";
import { IntegrationRow } from "@/components/pages/navbar/docs/integration-row";
import {
  cliIntegrations,
  rpIntegrations,
} from "@/components/pages/navbar/docs/integrations";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { getTranslations } from "next-intl/server";

export async function DocsIndexContent() {
  const t = await getTranslations();

  const toc = createTOC(
    [
      {
        title: t("DOCS_SIDEBAR.GROUP_CLI"),
        url: "#group-cli",
        depth: 2,
      },
      ...cliIntegrations.map((integration) => ({
        title: t(integration.titleKey),
        url: `#${integration.href.replace("/docs/", "")}`,
        depth: 3 as const,
      })),
      {
        title: t("DOCS_SIDEBAR.GROUP_ROLEPLAY"),
        url: "#group-roleplay",
        depth: 2,
      },
      ...rpIntegrations.map((integration) => ({
        title: t(integration.titleKey),
        url: `#${integration.href.replace("/docs/", "")}`,
        depth: 3 as const,
      })),
      {
        title: t("DOCS_INDEX.CTA_TITLE"),
        url: "#get-started",
        depth: 2,
      },
    ],
    t("DOCS.TOC_TITLE"),
  );

  return (
    <TOCLayout toc={toc}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <PageHeader
          badge={t("DOCS_INDEX.BADGE")}
          badgeIcon="book-open"
          title={t("DOCS_INDEX.TITLE")}
          subtitle={t("DOCS_INDEX.SUBTITLE", APP_VALUES)}
          centered
          className="mb-12"
        />

        <section>
          <h2
            id="group-cli"
            className="text-muted-foreground mb-4 font-mono text-xs tracking-widest uppercase"
          >
            {t("DOCS_SIDEBAR.GROUP_CLI")}
          </h2>
          <div className="space-y-6">
            {cliIntegrations.map((integration) => (
              <IntegrationRow
                key={integration.href}
                integration={integration}
                id={integration.href.replace("/docs/", "")}
              />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2
            id="group-roleplay"
            className="text-muted-foreground mb-4 font-mono text-xs tracking-widest uppercase"
          >
            {t("DOCS_SIDEBAR.GROUP_ROLEPLAY")}
          </h2>
          <div className="space-y-6">
            {rpIntegrations.map((integration) => (
              <IntegrationRow
                key={integration.href}
                integration={integration}
                id={integration.href.replace("/docs/", "")}
              />
            ))}
          </div>
        </section>

        <section className="border-border mt-20 border-t pt-12 text-center">
          <h2 className="text-2xl font-semibold" id="get-started">
            {t("DOCS_INDEX.CTA_TITLE")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t("DOCS_INDEX.CTA_DESC", APP_VALUES)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <GetStartedButton
              translationKey="DOCS_INDEX.CTA_SIGNUP"
              authedTranslationKey="DOCS_INDEX.CTA_DASHBOARD"
            />
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link href="/models" />}
            >
              {t("DOCS_INDEX.CTA_MODELS")}
            </Button>
          </div>
        </section>
      </div>
    </TOCLayout>
  );
}
