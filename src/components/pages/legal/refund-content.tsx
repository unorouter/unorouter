import { LegalSection } from "@/components/pages/legal/legal-section";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getTranslations } from "next-intl/server";

export async function RefundContent() {
  const t = await getTranslations();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground mb-8 inline-block text-sm"
      >
        &larr; {t("REFUND.TITLE")}
      </Link>

      <h1 className="mb-2 text-3xl font-bold">{t("REFUND.TITLE")}</h1>
      <p className="text-muted-foreground mb-10 text-sm">
        {t("REFUND.LAST_UPDATED")}
      </p>

      <p className="text-muted-foreground mb-10 leading-relaxed">
        {t("REFUND.INTRO", APP_VALUES)}
      </p>

      <LegalSection title={t("REFUND.PAYMENTS_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("REFUND.PAYMENTS_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("REFUND.ELIGIBILITY_TITLE")}>
        <p className="text-muted-foreground mb-3 leading-relaxed">
          {t("REFUND.ELIGIBILITY_INTRO")}
        </p>
        <ul className="text-muted-foreground list-disc space-y-2 pl-6 leading-relaxed">
          <li>{t("REFUND.ELIGIBILITY_WINDOW")}</li>
          <li>{t("REFUND.ELIGIBILITY_USAGE")}</li>
          <li>{t("REFUND.ELIGIBILITY_COMPLIANCE")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("REFUND.NON_REFUNDABLE_TITLE")}>
        <p className="text-muted-foreground mb-3 leading-relaxed">
          {t("REFUND.NON_REFUNDABLE_INTRO")}
        </p>
        <ul className="text-muted-foreground list-disc space-y-2 pl-6 leading-relaxed">
          <li>{t("REFUND.NON_REFUNDABLE_PARTIAL")}</li>
          <li>{t("REFUND.NON_REFUNDABLE_FEES")}</li>
          <li>{t("REFUND.NON_REFUNDABLE_TERMINATED")}</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("REFUND.REQUEST_TITLE")}>
        <p className="text-muted-foreground mb-3 leading-relaxed">
          {t("REFUND.REQUEST_INTRO", APP_VALUES)}
        </p>
        <ul className="text-muted-foreground list-disc space-y-2 pl-6 leading-relaxed">
          <li>{t("REFUND.REQUEST_ACCOUNT")}</li>
          <li>{t("REFUND.REQUEST_PROOF")}</li>
          <li>{t("REFUND.REQUEST_REASON")}</li>
        </ul>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          {t("REFUND.REQUEST_VERIFY")}
        </p>
      </LegalSection>

      <LegalSection title={t("REFUND.PROCESSING_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("REFUND.PROCESSING_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("REFUND.LAW_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("REFUND.LAW_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("REFUND.CHANGES_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("REFUND.CHANGES_CONTENT")}
        </p>
      </LegalSection>

      <LegalSection title={t("REFUND.CONTACT_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("REFUND.CONTACT_CONTENT", APP_VALUES)}
        </p>
      </LegalSection>
    </main>
  );
}
