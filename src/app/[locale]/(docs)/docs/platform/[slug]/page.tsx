import { AccountAndBillingContent } from "@/components/pages/docs/platform/content/account-and-billing-content";
import { DiscordRewardsContent } from "@/components/pages/docs/platform/content/discord-rewards-content";
import { ErrorsAndRateLimitsContent } from "@/components/pages/docs/platform/content/errors-and-rate-limits-content";
import { GroupPinningContent } from "@/components/pages/docs/platform/content/group-pinning-content";
import { ModelsAndPricingContent } from "@/components/pages/docs/platform/content/models-and-pricing-content";
import { NotificationsContent } from "@/components/pages/docs/platform/content/notifications-content";
import { QuickstartContent } from "@/components/pages/docs/platform/content/quickstart-content";
import {
  PlatformDocTemplate,
  platformDocKey,
} from "@/components/pages/docs/platform/platform-doc-template";
import { getPlatformDoc } from "@/components/pages/docs/platform/platform-docs";
import type { Pathname } from "@/i18n/routing";
import { APP_VALUES } from "@/lib/config/constants";
import { DocPageSchema } from "@/lib/seo/json-ld";
import { getPageMetadata, notFoundMetadata, ogBadge } from "@/lib/seo/metadata";
import type { DocSlug } from "@/lib/types";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const doc = getPlatformDoc(params.slug);
  if (!doc) return notFoundMetadata();
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: doc.href as Pathname,
    title: t(platformDocKey(doc.i18nPrefix, "META.TITLE"), APP_VALUES),
    description: t(
      platformDocKey(doc.i18nPrefix, "META.DESCRIPTION"),
      APP_VALUES,
    ),
    keywords: t(platformDocKey(doc.i18nPrefix, "META.KEYWORDS"), APP_VALUES),
    ogImage: ogBadge("hero", locale),
  });
}

const CONTENT: Record<string, React.ComponentType> = {
  quickstart: QuickstartContent,
  "models-and-pricing": ModelsAndPricingContent,
  notifications: NotificationsContent,
  "group-pinning": GroupPinningContent,
  "errors-and-rate-limits": ErrorsAndRateLimitsContent,
  "account-and-billing": AccountAndBillingContent,
  "discord-rewards": DiscordRewardsContent,
};

export default async function PlatformDocPage(props: PageProps) {
  await serverLocale(props);
  const params = await props.params;
  const doc = getPlatformDoc(params.slug);
  const Content = doc ? CONTENT[doc.slug] : undefined;
  if (!doc || !Content) notFound();
  const t = await getTranslations();
  return (
    <>
      <DocPageSchema
        slug={`docs/platform/${doc.slug}` as DocSlug}
        title={t(platformDocKey(doc.i18nPrefix, "META.TITLE"), APP_VALUES)}
        description={t(
          platformDocKey(doc.i18nPrefix, "META.DESCRIPTION"),
          APP_VALUES,
        )}
      />
      <PlatformDocTemplate doc={doc}>
        <Content />
      </PlatformDocTemplate>
    </>
  );
}
