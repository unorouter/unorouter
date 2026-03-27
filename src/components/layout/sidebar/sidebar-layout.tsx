"use client";

import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import type { SidebarNavConfig } from "@/components/layout/sidebar/app-sidebar";
import { SidebarHeader } from "@/components/layout/sidebar/sidebar-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { sidebarOpenAtom } from "@/store/navigation-store";
import { useAtom } from "jotai";

interface SidebarLayoutProps {
  navConfig?: SidebarNavConfig;
  showSearch?: boolean;
  before?: React.ReactNode;
  children: React.ReactNode;
}

export function SidebarLayout(props: SidebarLayoutProps) {
  const [open, setOpen] = useAtom(sidebarOpenAtom);

  return (
    <SidebarProvider
      open={open}
      onOpenChange={setOpen}
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      {props.before}
      <AppSidebar variant="inset" navConfig={props.navConfig} />
      <SidebarInset>
        <SidebarHeader showSearch={props.showSearch} />
        <div className="flex flex-1">{props.children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
