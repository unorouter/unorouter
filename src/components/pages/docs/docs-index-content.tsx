import { APP_VALUES } from "@/lib/config/constants";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GetStartedButton } from "@/components/elements/get-started-link";
import { IntegrationRow } from "@/components/pages/navbar/docs/integration-row";
import { integrations } from "@/components/pages/navbar/docs/integrations";
import { getTranslations } from "next-intl/server";

export async function DocsIndexContent() {
  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          {t("DOCS_INDEX.TITLE")}
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl font-mono text-lg">
          {t("DOCS_INDEX.SUBTITLE", APP_VALUES)}
        </p>
      </div>

      <div className="space-y-6">
        {integrations.map((integration) => (
          <IntegrationRow key={integration.href} integration={integration} />
        ))}
      </div>

      <section className="border-border mt-20 border-t pt-12 text-center">
        <h2 className="text-2xl font-semibold">{t("DOCS_INDEX.CTA_TITLE")}</h2>
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
  );
}
