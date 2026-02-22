import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("PRIVACY");
  return { title: t("TITLE") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("PRIVACY");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-8 inline-block text-sm"
      >
        &larr; {t("TITLE")}
      </Link>

      <h1 className="mb-2 text-3xl font-bold">{t("TITLE")}</h1>
      <p className="text-muted-foreground mb-10 text-sm">{t("LAST_UPDATED")}</p>

      <p className="text-muted-foreground mb-10 leading-relaxed">{t("INTRO")}</p>

      <Section title={t("COLLECTION_TITLE")}>
        <h3 className="mt-4 mb-2 font-medium">{t("COLLECTION_VOLUNTARY_TITLE")}</h3>
        <p className="text-muted-foreground leading-relaxed">
          {t("COLLECTION_VOLUNTARY")}
        </p>
        <h3 className="mt-4 mb-2 font-medium">{t("COLLECTION_AUTO_TITLE")}</h3>
        <p className="text-muted-foreground leading-relaxed">
          {t("COLLECTION_AUTO")}
        </p>
        <h3 className="mt-4 mb-2 font-medium">{t("COLLECTION_COOKIES_TITLE")}</h3>
        <p className="text-muted-foreground leading-relaxed">
          {t("COLLECTION_COOKIES")}
        </p>
      </Section>

      <Section title={t("USE_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">{t("USE_CONTENT")}</p>
      </Section>

      <Section title={t("SHARING_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("SHARING_CONTENT")}
        </p>
      </Section>

      <Section title={t("RIGHTS_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("RIGHTS_CONTENT")}
        </p>
      </Section>

      <Section title={t("SECURITY_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("SECURITY_CONTENT")}
        </p>
      </Section>

      <Section title={t("THIRD_PARTY_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("THIRD_PARTY_CONTENT")}
        </p>
      </Section>

      <Section title={t("RETENTION_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("RETENTION_CONTENT")}
        </p>
      </Section>

      <Section title={t("CHILDREN_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("CHILDREN_CONTENT")}
        </p>
      </Section>

      <Section title={t("TRANSFERS_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TRANSFERS_CONTENT")}
        </p>
      </Section>

      <Section title={t("CHANGES_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("CHANGES_CONTENT")}
        </p>
      </Section>

      <Section title={t("CONTACT_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("CONTACT_CONTENT")}
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
