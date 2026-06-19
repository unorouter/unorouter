import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { CrossOriginIsolationGuard } from "@/components/provider/app/cross-origin-isolation-guard";
import { PlaygroundList } from "@/components/pages/sidebar/playground/history/playground-list";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";

export default function GenerateGroupLayout(props: {
  children: React.ReactNode;
}) {
  return (
    <CrossOriginIsolationGuard>
      <SidebarLayout
        before={<AuthRedirectCleanup />}
        navConfig="generate"
        chatContent={<PlaygroundList />}
      >
        {props.children}
      </SidebarLayout>
    </CrossOriginIsolationGuard>
  );
}
