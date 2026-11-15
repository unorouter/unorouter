import { AccountAndBillingContent } from "@/components/pages/docs/platform/content/account-and-billing-content";
import { ConsentsContent } from "@/components/pages/docs/platform/content/consents-content";
import { DiscordRewardsContent } from "@/components/pages/docs/platform/content/discord-rewards-content";
import { ErrorsAndRateLimitsContent } from "@/components/pages/docs/platform/content/errors-and-rate-limits-content";
import { GroupPinningContent } from "@/components/pages/docs/platform/content/group-pinning-content";
import { ModelsAndPricingContent } from "@/components/pages/docs/platform/content/models-and-pricing-content";
import { NotificationsContent } from "@/components/pages/docs/platform/content/notifications-content";
import { PlatformApiContent } from "@/components/pages/docs/platform/content/platform-api-content";
import { QuickstartContent } from "@/components/pages/docs/platform/content/quickstart-content";
import { PLATFORM_DOCS } from "@/components/pages/docs/platform/platform-docs";
import { DocTemplate, docKey } from "@/components/pages/docs/doc-template";
import { APP_VALUES } from "@/lib/config/constants";
import { DocPageSchema } from "@/lib/seo/json-ld";
import { getPageMetadata, notFoundMetadata } from "@/lib/seo/metadata";
import type { DocSlug } from "@/lib/types";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const doc = PLATFORM_DOCS.find((d) => d.slug === params.slug);
  if (!doc) return notFoundMetadata();
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: doc.href,
    title: t(docKey(doc.i18nPrefix, "META.TITLE"), APP_VALUES),
    description: t(docKey(doc.i18nPrefix, "META.DESCRIPTION"), APP_VALUES),
    keywords: t(docKey(doc.i18nPrefix, "META.KEYWORDS"), APP_VALUES),
  });
}

const CONTENT: Record<string, React.ComponentType> = {
  quickstart: QuickstartContent,
  "models-and-pricing": ModelsAndPricingContent,
  notifications: NotificationsContent,
  "group-pinning": GroupPinningContent,
  "platform-api": PlatformApiContent,
  consents: ConsentsContent,
  "errors-and-rate-limits": ErrorsAndRateLimitsContent,
  "account-and-billing": AccountAndBillingContent,
  "discord-rewards": DiscordRewardsContent,
};

export default async function PlatformDocPage(props: PageProps) {
  const params = await props.params;
  const doc = PLATFORM_DOCS.find((d) => d.slug === params.slug);
  const Content = doc ? CONTENT[doc.slug] : undefined;
  if (!doc || !Content) notFound();
  const t = await getTranslations();
  return (
    <>
      <DocPageSchema
        slug={`docs/platform/${doc.slug}` as DocSlug}
        title={t(docKey(doc.i18nPrefix, "META.TITLE"), APP_VALUES)}
        description={t(docKey(doc.i18nPrefix, "META.DESCRIPTION"), APP_VALUES)}
      />
      <DocTemplate
        doc={doc}
        docs={PLATFORM_DOCS}
        namespace="DOCS_PLATFORM"
        indexHref="/docs/platform"
      >
        <Content />
      </DocTemplate>
    </>
  );
}
