import { LegalSection } from "@/components/pages/legal/legal-section";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function TermsContent() {
  const t = await getTranslations();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-8 inline-block text-sm"
      >
        &larr; {t("TERMS.TITLE")}
      </Link>

      <h1 className="mb-2 text-3xl font-bold">{t("TERMS.TITLE")}</h1>
      <p className="text-muted-foreground mb-10 text-sm">
        {t("TERMS.LAST_UPDATED")}
      </p>

      <p className="text-muted-foreground mb-10 leading-relaxed">
        {t("TERMS.INTRO", APP_VALUES)}
      </p>

      <LegalSection title={t("TERMS.SERVICE_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.SERVICE_CONTENT", APP_VALUES)}
        </p>
      </LegalSection>

      <LegalSection title={t("TERMS.ELIGIBILITY_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.ELIGIBILITY_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("TERMS.ACCOUNTS_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.ACCOUNTS_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("TERMS.PAYMENT_TITLE")}>
        <p className="text-muted-foreground mb-3 leading-relaxed">
          {t("TERMS.PAYMENT_CONTENT_INTRO")}
        </p>
        <ul className="text-muted-foreground list-disc space-y-2 pl-6 leading-relaxed">
          <li>{t("TERMS.PAYMENT_CREDITS")}</li>
          <li>{t("TERMS.PAYMENT_REFUNDS")}</li>
          <li>{t("TERMS.PAYMENT_EXPIRATION")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("TERMS.USER_CONTENT_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.USER_CONTENT_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("TERMS.PROHIBITED_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.PROHIBITED_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("TERMS.TERMINATION_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.TERMINATION_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("TERMS.IP_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.IP_CONTENT", APP_VALUES)}
        </p>
      </LegalSection>

      <LegalSection title={t("TERMS.DISCLAIMER_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.DISCLAIMER_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("TERMS.LIABILITY_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.LIABILITY_CONTENT", APP_VALUES)}
        </p>
      </LegalSection>

      <LegalSection title={t("TERMS.INDEMNIFICATION_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.INDEMNIFICATION_CONTENT", APP_VALUES)}
        </p>
      </LegalSection>

      <LegalSection title={t("TERMS.LAW_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.LAW_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("TERMS.CHANGES_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.CHANGES_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("TERMS.CONTACT_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.CONTACT_CONTENT", APP_VALUES)}
        </p>
      </LegalSection>
    </main>
  );
}
