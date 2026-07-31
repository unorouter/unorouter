import { serverLocale } from "@/lib/utils/server";
import { AuthHydration } from "@/components/provider/state/auth-hydration";
import { Suspense } from "react";
import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { ImageSessionList } from "@/components/pages/sidebar/image/history/image-session-list";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";
import { SidebarShellSkeleton } from "@/components/layout/sidebar/sidebar-shell-skeleton";

export default async function ImageGroupLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await serverLocale(props);
  return (
    <Suspense fallback={<SidebarShellSkeleton />}>
      <AuthHydration>
        <SidebarLayout
          before={<AuthRedirectCleanup />}
          navConfig="generate"
          chatContent={<ImageSessionList />}
        >
          {props.children}
        </SidebarLayout>
      </AuthHydration>
    </Suspense>
  );
}
