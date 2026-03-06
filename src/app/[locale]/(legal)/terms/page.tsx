import { Link } from "@/i18n/navigation";
import { getPageMetadata } from "@/lib/config/metadata";
import { getTranslations } from "next-intl/server";
import { serverLocale } from "@/lib/utils/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("TERMS.META.TITLE"),
    description: t("TERMS.META.DESCRIPTION"),
    keywords: t("TERMS.META.KEYWORDS"),
  });
}

export default async function TermsPage() {
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
        {t("TERMS.INTRO")}
      </p>

      <Section title={t("TERMS.SERVICE_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.SERVICE_CONTENT")}
        </p>
      </Section>

      <Section title={t("TERMS.ELIGIBILITY_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.ELIGIBILITY_CONTENT")}
        </p>
      </Section>

      <Section title={t("TERMS.ACCOUNTS_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.ACCOUNTS_CONTENT")}
        </p>
      </Section>

      <Section title={t("TERMS.PAYMENT_TITLE")}>
        <p className="text-muted-foreground mb-3 leading-relaxed">
          {t("TERMS.PAYMENT_CONTENT_INTRO")}
        </p>
        <ul className="text-muted-foreground list-disc space-y-2 pl-6 leading-relaxed">
          <li>{t("TERMS.PAYMENT_CREDITS")}</li>
          <li>{t("TERMS.PAYMENT_REFUNDS")}</li>
          <li>{t("TERMS.PAYMENT_EXPIRATION")}</li>
        </ul>
      </Section>

      <Section title={t("TERMS.USER_CONTENT_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.USER_CONTENT_CONTENT")}
        </p>
      </Section>

      <Section title={t("TERMS.PROHIBITED_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.PROHIBITED_CONTENT")}
        </p>
      </Section>

      <Section title={t("TERMS.TERMINATION_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.TERMINATION_CONTENT")}
        </p>
      </Section>

      <Section title={t("TERMS.IP_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.IP_CONTENT")}
        </p>
      </Section>

      <Section title={t("TERMS.DISCLAIMER_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.DISCLAIMER_CONTENT")}
        </p>
      </Section>

      <Section title={t("TERMS.LIABILITY_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.LIABILITY_CONTENT")}
        </p>
      </Section>

      <Section title={t("TERMS.INDEMNIFICATION_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.INDEMNIFICATION_CONTENT")}
        </p>
      </Section>

      <Section title={t("TERMS.LAW_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.LAW_CONTENT")}
        </p>
      </Section>

      <Section title={t("TERMS.CHANGES_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.CHANGES_CONTENT")}
        </p>
      </Section>

      <Section title={t("TERMS.CONTACT_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMS.CONTACT_CONTENT")}
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
