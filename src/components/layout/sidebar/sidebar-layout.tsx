import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import type { SidebarNavConfig } from "@/components/layout/sidebar/app-sidebar";
import { SidebarHeader } from "@/components/layout/sidebar/sidebar-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface SidebarLayoutProps {
  navConfig?: SidebarNavConfig;
  showSearch?: boolean;
  before?: React.ReactNode;
  children: React.ReactNode;
}

export function SidebarLayout(props: SidebarLayoutProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      {props.before}
      <AppSidebar variant="inset" navConfig={props.navConfig} />
      <SidebarInset className="overflow-hidden">
        <SidebarHeader showSearch={props.showSearch} />
        <div className="flex flex-1 overflow-y-auto">{props.children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
