import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { PlaygroundList } from "@/components/pages/sidebar/playground/history/playground-list";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";

export default function GenerateGroupLayout(props: {
  children: React.ReactNode;
}) {
  return (
    <SidebarLayout
      before={<AuthRedirectCleanup />}
      navConfig="generate"
      chatContent={<PlaygroundList />}
    >
      {props.children}
    </SidebarLayout>
  );
}
