import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";
import { APP_VALUES } from "@/lib/config/constants";
import { rpc } from "@/lib/rpc";
import { getPageMetadata } from "@/lib/seo/metadata";
import { serverLocale, setCookies } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

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
    title: t("METADATA.ACCOUNT.TITLE", APP_VALUES),
    description: t("METADATA.ACCOUNT.DESC", APP_VALUES),
    keywords: t("METADATA.ACCOUNT.KEYWORDS", APP_VALUES),
    robots: false,
  });
}

export default async function DashboardLayout(props: DashboardLayoutProps) {
  const response = await rpc.api.auth.self.get(await setCookies());
  if (response.status !== 200) redirect("/login");

  return (
    <SidebarLayout before={<AuthRedirectCleanup />}>
      {props.children}
    </SidebarLayout>
  );
}
