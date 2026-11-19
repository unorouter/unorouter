import { ContactForm } from "@/components/pages/legal/contact-form";
import { Link } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/seo/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  // Only the Impressum links here; it exists for § 5 DDG, not for search.
  return getPageMetadata({
    robots: false,
    locale,
    href: "/contact",
    title: t("CONTACT.META.TITLE", APP_VALUES),
    description: t("CONTACT.META.DESCRIPTION", APP_VALUES),
    keywords: t("CONTACT.META.KEYWORDS", APP_VALUES),
  });
}

export default async function ContactPage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/impressum"
        className="text-muted-foreground hover:text-foreground mb-8 inline-block text-sm"
      >
        &larr; {t("IMPRESSUM.TITLE")}
      </Link>
      <h1 className="mb-2 text-3xl font-bold">{t("CONTACT.TITLE")}</h1>
      <p className="text-muted-foreground mb-10 leading-relaxed">
        {t("CONTACT.INTRO")}
      </p>
      <ContactForm />
    </main>
  );
}
