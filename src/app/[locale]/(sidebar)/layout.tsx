import { AuthRedirectCleanup } from "@/components/elements/auth-redirect-cleanup";
import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { rpc } from "@/lib/rpc";
import { setCookies } from "@/lib/utils/server";
import { redirect } from "next/navigation";

interface DashboardLayoutProps {
  children: React.ReactNode;
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
