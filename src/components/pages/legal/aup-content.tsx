import { LegalSection } from "@/components/pages/legal/legal-section";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function AupContent() {
  const t = await getTranslations();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-8 inline-block text-sm"
      >
        &larr; {t("AUP.TITLE")}
      </Link>

      <h1 className="mb-2 text-3xl font-bold">{t("AUP.TITLE")}</h1>
      <p className="text-muted-foreground mb-10 text-sm">
        {t("AUP.LAST_UPDATED")}
      </p>

      <p className="text-muted-foreground mb-10 leading-relaxed">
        {t("AUP.INTRO", APP_VALUES)}
      </p>

      <LegalSection title={t("AUP.PROHIBITED_CONTENT_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("AUP.PROHIBITED_CONTENT_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("AUP.PROHIBITED_DEEPFAKE_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("AUP.PROHIBITED_DEEPFAKE_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("AUP.PROHIBITED_HARM_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("AUP.PROHIBITED_HARM_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("AUP.UPSTREAM_MODERATION_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("AUP.UPSTREAM_MODERATION_CONTENT", APP_VALUES)}
        </p>
      </LegalSection>

      <LegalSection title={t("AUP.ENFORCEMENT_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("AUP.ENFORCEMENT_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("AUP.CHANGES_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("AUP.CHANGES_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("AUP.CONTACT_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("AUP.CONTACT_CONTENT", APP_VALUES)}
        </p>
      </LegalSection>
    </main>
  );
}
