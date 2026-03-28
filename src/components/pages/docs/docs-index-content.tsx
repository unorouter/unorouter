import { APP_VALUES } from "@/lib/config/constants";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/elements/content/page-header";
import { GetStartedButton } from "@/components/elements/brand/get-started-link";
import { IntegrationRow } from "@/components/pages/navbar/docs/integration-row";
import { integrations } from "@/components/pages/navbar/docs/integrations";
import { TOCLayout } from "@/components/layout/docs/toc";
import { createTOC } from "@/components/layout/docs/toc-utils";
import { getTranslations } from "next-intl/server";
import { LuBookOpen } from "react-icons/lu";

export async function DocsIndexContent() {
  const t = await getTranslations();

  const toc = createTOC(
    [
      ...integrations.map((integration) => ({
        title: t(integration.titleKey),
        url: `#${integration.href.replace("/docs/", "")}`,
        depth: 2 as const,
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
          badgeIcon={LuBookOpen}
          title={t("DOCS_INDEX.TITLE")}
          subtitle={t("DOCS_INDEX.SUBTITLE", APP_VALUES)}
          centered
          className="mb-12"
        />

        <div className="space-y-6">
          {integrations.map((integration) => (
            <IntegrationRow
              key={integration.href}
              integration={integration}
              id={integration.href.replace("/docs/", "")}
            />
          ))}
        </div>

        <section
          className="border-border mt-20 border-t pt-12 text-center"
        >
          <h2 className="text-2xl font-semibold" id="get-started">
            {t("DOCS_INDEX.CTA_TITLE")}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t("DOCS_INDEX.CTA_DESC", APP_VALUES)}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <GetStartedButton translationKey="DOCS_INDEX.CTA_SIGNUP" />
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
