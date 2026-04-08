"use client";

import type { SidebarNavConfig } from "@/components/layout/sidebar/app-sidebar";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SidebarHeader } from "@/components/layout/sidebar/sidebar-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { sidebarOpenAtom } from "@/store/navigation-store";
import { useAtom } from "jotai";

export function PageContent(props: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-0 p-4 pb-8 md:p-6 md:pb-10",
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

interface SidebarLayoutProps {
  navConfig?: SidebarNavConfig;
  showSearch?: boolean;
  before?: React.ReactNode;
  chatContent?: React.ReactNode;
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
      <AppSidebar navConfig={props.navConfig} chatContent={props.chatContent} />
      <SidebarInset>
        <SidebarHeader
          showSearch={props.showSearch}
          navConfig={props.navConfig}
        />
        <div className="min-w-0 flex-1">
          {props.children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
