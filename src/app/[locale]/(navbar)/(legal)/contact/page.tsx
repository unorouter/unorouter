import { ContactForm } from "@/components/pages/legal/contact-form";
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

export default function ContactPage() {
  return <ContactForm />;
}
