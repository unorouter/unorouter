import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";
import { redirect } from "@/i18n/navigation";
import {
  APP_VALUES,
  AUTH_REDIRECT_QUERY,
  SERVER_URL_KEY,
} from "@/lib/config/constants";
import { rpc } from "@/lib/rpc";
import { getPageMetadata } from "@/lib/seo/metadata";
import { serverLocale, setCookies } from "@/lib/utils/server";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

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

export default async function DashboardLayout(props: DashboardLayoutProps) {
  const response = await rpc.api.auth.account.self.get(await setCookies());
  if (response.status !== 200) {
    // Bounce the user to /login with the originating path so they land back
    // here after authenticating. The URL is stamped onto the REQUEST headers
    // by src/proxy.ts (SERVER_URL_KEY).
    const locale = await serverLocale();
    const incoming = (await headers()).get(SERVER_URL_KEY);
    let target = "";
    if (incoming) {
      try {
        const u = new URL(incoming);
        target = u.pathname + (u.search || "");
      } catch {
        target = "";
      }
    }
    redirect({
      href: target
        ? { pathname: "/login", query: { [AUTH_REDIRECT_QUERY]: target } }
        : "/login",
      locale,
    });
  }

  return (
    <SidebarLayout before={<AuthRedirectCleanup />}>
      {props.children}
    </SidebarLayout>
  );
}
