import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/config/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { IntegrationRow } from "@/components/pages/docs/integration-row";
import { integrations } from "@/components/pages/docs/integrations";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("DOCS_INDEX.META.TITLE", APP_VALUES),
    description: t("DOCS_INDEX.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS_INDEX.META.KEYWORDS"),
  });
}

export default async function DocsPage() {
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

      {/* CTA */}
      <section className="border-border mt-20 border-t pt-12 text-center">
        <h2 className="text-2xl font-semibold">{t("DOCS_INDEX.CTA_TITLE")}</h2>
        <p className="text-muted-foreground mt-2">
          {t("DOCS_INDEX.CTA_DESC", APP_VALUES)}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            nativeButton={false}
            render={<a href={`${process.env.NEXT_PUBLIC_API_URL}/register`} />}
          >
            {t("DOCS_INDEX.CTA_SIGNUP")}
          </Button>
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
