import { DocsSidebar } from "@/components/layout/docs/docs-sidebar";
import { DocsHeader } from "@/components/layout/docs/docs-header";
import { DocsSidebarProvider } from "@/components/layout/docs/docs-sidebar-provider";
import { SidebarInset } from "@/components/ui/sidebar";

interface DocsLayoutProps {
  children: React.ReactNode;
}

export default function DocsLayout(props: DocsLayoutProps) {
  return (
    <DocsSidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <DocsSidebar variant="sidebar" />
      <SidebarInset>
        <DocsHeader />
        <div className="flex flex-1">{props.children}</div>
      </SidebarInset>
    </DocsSidebarProvider>
  );
}
