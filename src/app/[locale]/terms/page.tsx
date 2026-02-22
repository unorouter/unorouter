import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("TERMS");
  return { title: t("TITLE") };
}

export default async function TermsPage() {
  const t = await getTranslations("TERMS");

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

      <Section title={t("SERVICE_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("SERVICE_CONTENT")}
        </p>
      </Section>

      <Section title={t("ELIGIBILITY_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("ELIGIBILITY_CONTENT")}
        </p>
      </Section>

      <Section title={t("ACCOUNTS_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("ACCOUNTS_CONTENT")}
        </p>
      </Section>

      <Section title={t("PAYMENT_TITLE")}>
        <p className="text-muted-foreground mb-3 leading-relaxed">
          {t("PAYMENT_CONTENT_INTRO")}
        </p>
        <ul className="text-muted-foreground list-disc space-y-2 pl-6 leading-relaxed">
          <li>{t("PAYMENT_CREDITS")}</li>
          <li>{t("PAYMENT_REFUNDS")}</li>
          <li>{t("PAYMENT_EXPIRATION")}</li>
        </ul>
      </Section>

      <Section title={t("USER_CONTENT_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("USER_CONTENT_CONTENT")}
        </p>
      </Section>

      <Section title={t("PROHIBITED_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("PROHIBITED_CONTENT")}
        </p>
      </Section>

      <Section title={t("TERMINATION_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("TERMINATION_CONTENT")}
        </p>
      </Section>

      <Section title={t("IP_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">{t("IP_CONTENT")}</p>
      </Section>

      <Section title={t("DISCLAIMER_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("DISCLAIMER_CONTENT")}
        </p>
      </Section>

      <Section title={t("LIABILITY_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("LIABILITY_CONTENT")}
        </p>
      </Section>

      <Section title={t("INDEMNIFICATION_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">
          {t("INDEMNIFICATION_CONTENT")}
        </p>
      </Section>

      <Section title={t("LAW_TITLE")}>
        <p className="text-muted-foreground leading-relaxed">{t("LAW_CONTENT")}</p>
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
