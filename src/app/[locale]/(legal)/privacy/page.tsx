import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata, ogBadge } from "@/lib/config/metadata";
import { getTranslations } from "next-intl/server";
import { serverLocale } from "@/lib/utils/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("PRIVACY.META.TITLE", APP_VALUES),
    description: t("PRIVACY.META.DESCRIPTION", APP_VALUES),
    keywords: t("PRIVACY.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("providers", locale),
  });
}

export default async function PrivacyPage() {
  const t = await getTranslations();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-8 inline-block text-sm"
      >
        &larr; {t("PRIVACY.TITLE")}
      </Link>

      <h1 className="mb-2 text-3xl font-bold">{t("PRIVACY.TITLE")}</h1>
      <p className="text-muted-foreground mb-10 text-sm">
        {t("PRIVACY.LAST_UPDATED")}
      </p>

      <p className="text-muted-foreground mb-10 leading-relaxed">
        {t("PRIVACY.INTRO", APP_VALUES)}
      </p>

      <Section title={t("PRIVACY.COLLECTION_TITLE")}>
        <h3 className="mt-4 mb-2 font-medium">
          {t("PRIVACY.COLLECTION_VOLUNTARY_TITLE")}
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.COLLECTION_VOLUNTARY")}
        </p>
        <h3 className="mt-4 mb-2 font-medium">
          {t("PRIVACY.COLLECTION_AUTO_TITLE")}
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.COLLECTION_AUTO")}
        </p>
        <h3 className="mt-4 mb-2 font-medium">
          {t("PRIVACY.COLLECTION_COOKIES_TITLE")}
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.COLLECTION_COOKIES")}
        </p>
      </Section>

      <Section title={t("PRIVACY.USE_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.USE_CONTENT")}
        </p>
      </Section>

      <Section title={t("PRIVACY.SHARING_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.SHARING_CONTENT")}
        </p>
      </Section>

      <Section title={t("PRIVACY.RIGHTS_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.RIGHTS_CONTENT", APP_VALUES)}
        </p>
      </Section>

      <Section title={t("PRIVACY.SECURITY_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.SECURITY_CONTENT")}
        </p>
      </Section>

      <Section title={t("PRIVACY.THIRD_PARTY_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.THIRD_PARTY_CONTENT")}
        </p>
      </Section>

      <Section title={t("PRIVACY.RETENTION_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.RETENTION_CONTENT")}
        </p>
      </Section>

      <Section title={t("PRIVACY.CHILDREN_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.CHILDREN_CONTENT")}
        </p>
      </Section>

      <Section title={t("PRIVACY.TRANSFERS_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.TRANSFERS_CONTENT")}
        </p>
      </Section>

      <Section title={t("PRIVACY.CHANGES_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.CHANGES_CONTENT")}
        </p>
      </Section>

      <Section title={t("PRIVACY.CONTACT_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.CONTACT_CONTENT", APP_VALUES)}
        </p>
      </Section>
    </main>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-semibold">{props.title}</h2>
      {props.children}
    </section>
  );
}
