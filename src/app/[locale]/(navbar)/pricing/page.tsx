import { prefetchElysia } from "@/lib/react-query/prefetch";
import { IntegrationBanner } from "@/components/pages/navbar/home/integration-banner";
import { Pricing } from "@/components/pages/navbar/pricing/pricing";
import { APP_VALUES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildFAQPageSchema,
  buildSoftwareApplicationSchema,
  type FAQEntry,
} from "@/lib/seo/structured-data";
import { localeUrl } from "@/i18n/navigation";
import { serverLocale } from "@/lib/utils/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/pricing",
    title: t("PRICING.META.TITLE", APP_VALUES),
    description: t("PRICING.META.DESCRIPTION"),
    keywords: t("PRICING.META.KEYWORDS"),
    ogImage: ogBadge("sponsor", locale),
  });
}

export default async function PricingPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const queryClient = getQueryClient();
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.subscriptionPlans(), () =>
      rpc.api.models.pricing.subscriptions.get(),
    ),
    prefetchElysia(queryClient, queryKeys.topUpInfo(), () =>
      rpc.api.billing.core["topup-info"].get(),
    ),
  ]);

  const faqEntries: FAQEntry[] = ([1, 2, 3, 4, 5, 6, 7, 8] as const).map(
    (n) => ({
      question: t(`PRICING.FAQ.Q${n}`, APP_VALUES),
      answer: t(`PRICING.FAQ.A${n}`, APP_VALUES),
    }),
  );

  return (
    <>
      <JsonLd
        id="pricing-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("NAV.PRICING"), url: localeUrl(locale, "/pricing") },
        ])}
      />
      <JsonLd id="pricing-faq" data={buildFAQPageSchema(faqEntries)} />
      <JsonLd
        id="pricing-app"
        data={buildSoftwareApplicationSchema({
          locale,
          description: t("PRICING.META.DESCRIPTION"),
        })}
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Pricing />
      </HydrationBoundary>
      <IntegrationBanner />
    </>
  );
}
