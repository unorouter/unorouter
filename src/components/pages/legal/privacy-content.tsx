import { LegalSection } from "@/components/pages/legal/legal-section";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function PrivacyContent() {
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

      <LegalSection title={t("PRIVACY.COLLECTION_TITLE")}>
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
      </LegalSection>

      <LegalSection title={t("PRIVACY.USE_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.USE_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("PRIVACY.SHARING_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.SHARING_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("PRIVACY.RIGHTS_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.RIGHTS_CONTENT", APP_VALUES)}
        </p>
      </LegalSection>

      <LegalSection title={t("PRIVACY.SECURITY_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.SECURITY_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("PRIVACY.THIRD_PARTY_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.THIRD_PARTY_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("PRIVACY.RETENTION_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.RETENTION_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("PRIVACY.CHILDREN_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.CHILDREN_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("PRIVACY.TRANSFERS_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.TRANSFERS_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("PRIVACY.CHANGES_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.CHANGES_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("PRIVACY.CONTACT_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PRIVACY.CONTACT_CONTENT", APP_VALUES)}
        </p>
      </LegalSection>
    </main>
  );
}
