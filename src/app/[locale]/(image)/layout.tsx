import { AuthHydration } from "@/components/provider/state/auth-hydration";
import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { ImageSessionList } from "@/components/pages/sidebar/image/history/image-gallery";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";

export default async function ImageGroupLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  return (
    <AuthHydration>
      <SidebarLayout
        before={<AuthRedirectCleanup />}
        navConfig="generate"
        chatContent={<ImageSessionList />}
      >
        {props.children}
      </SidebarLayout>
    </AuthHydration>
  );
}
