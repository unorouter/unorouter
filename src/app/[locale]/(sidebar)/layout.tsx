import { AuthRedirectCleanup } from "@/components/elements/auth-redirect-cleanup";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SidebarHeader } from "@/components/layout/sidebar/sidebar-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { rpc } from "@/lib/rpc";
import { setCookies } from "@/lib/utils/server";
import { redirect } from "next/navigation";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default async function SidebarLayout(props: SidebarLayoutProps) {
  const response = await rpc.api.auth.self.get(await setCookies());
  if (response.status !== 200) redirect("/login");
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      <AuthRedirectCleanup />
      <AppSidebar variant="inset" />
      <SidebarInset className="overflow-hidden">
        <SidebarHeader />
        <div className="flex flex-1 overflow-y-auto">{props.children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
