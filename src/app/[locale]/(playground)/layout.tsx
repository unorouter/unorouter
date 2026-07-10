import { serverLocale } from "@/lib/utils/server";
import { AuthHydration } from "@/components/provider/state/auth-hydration";
import { Suspense } from "react";
import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { CrossOriginIsolationGuard } from "@/components/provider/app/cross-origin-isolation-guard";
import { PlaygroundList } from "@/components/pages/sidebar/playground/history/playground-list";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";

export default async function GenerateGroupLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await serverLocale(props);
  return (
    <Suspense>
      <AuthHydration>
        <CrossOriginIsolationGuard>
      <SidebarLayout
        before={<AuthRedirectCleanup />}
        navConfig="generate"
        chatContent={<PlaygroundList />}
      >
        {props.children}
        </SidebarLayout>
        </CrossOriginIsolationGuard>
      </AuthHydration>
    </Suspense>
  );
}
