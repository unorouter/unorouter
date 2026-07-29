import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { SidebarShellSkeleton } from "@/components/layout/sidebar/sidebar-shell-skeleton";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";
import { APP_VALUES } from "@/lib/config/constants";
import { rpc } from "@/lib/rpc";
import { getPageMetadata } from "@/lib/seo/metadata";
import { redirectToLogin, serverLocale } from "@/lib/utils/server";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { dehydrateOnly, prefetchElysia } from "@/lib/react-query/prefetch";
import { HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/dashboard",
    title: t("METADATA.ACCOUNT.TITLE", APP_VALUES),
    description: t("METADATA.ACCOUNT.DESC", APP_VALUES),
    keywords: t("METADATA.ACCOUNT.KEYWORDS", APP_VALUES),
    robots: false,
  });
}

async function AuthGate(props: DashboardLayoutProps) {
  const queryClient = getQueryClient();
  await prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
    rpc.api.auth.account.self.get(cookies),
  );
  if (!queryClient.getQueryData(queryKeys.auth())) await redirectToLogin();

  await prefetchElysia(queryClient, queryKeys.subscriptionSelf(), (cookies) =>
    rpc.api.billing.core["subscription-self"].get(cookies),
  );

  return (
    <HydrationBoundary
      state={dehydrateOnly(queryClient, [
        queryKeys.auth(),
        queryKeys.subscriptionSelf(),
      ])}
    >
      <SidebarLayout before={<AuthRedirectCleanup />}>
        {props.children}
      </SidebarLayout>
    </HydrationBoundary>
  );
}

// The Suspense gate keeps the cookie-based auth check out of the static
// shell; it also covers every sidebar page's own request-bound prefetches.
export default function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <Suspense fallback={<SidebarShellSkeleton />}>
      <AuthGate>{props.children}</AuthGate>
    </Suspense>
  );
}
