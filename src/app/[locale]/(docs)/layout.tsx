import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SidebarHeader } from "@/components/layout/sidebar/sidebar-header";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface DocsLayoutProps {
  children: React.ReactNode;
}

export default function DocsLayout(props: DocsLayoutProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="sidebar" navConfig="docs" />
      <SidebarInset>
        <SidebarHeader />
        <div className="flex flex-1">{props.children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
