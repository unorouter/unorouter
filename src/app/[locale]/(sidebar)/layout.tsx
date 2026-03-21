import { AuthRedirectCleanup } from "@/components/elements/auth-redirect-cleanup";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SidebarHeader } from "@/components/layout/sidebar/sidebar-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout(props: SidebarLayoutProps) {
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
      <SidebarInset>
        <SidebarHeader />
        <div className="flex flex-1">{props.children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
