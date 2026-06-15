"use client";

import { ContentBoundary } from "@/components/elements/feedback/content-boundary";
import type { SidebarNavConfig } from "@/components/layout/sidebar/app-sidebar";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SidebarHeader } from "@/components/layout/sidebar/sidebar-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { sidebarOpenAtom } from "@/store/client-store";
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
      // Chat and Generate own their internal scrollers; letting the inset also scroll produces two stacked scrollbars.
  const isChat = props.navConfig === "chat" || props.navConfig === "generate";

  return (
    <SidebarProvider
      open={open}
      onOpenChange={(next) => {
        analytics.navigation.sidebarToggled(next);
        setOpen(next);
      }}
      style={
        {
          "--sidebar-width": "16rem",
        } as React.CSSProperties
      }
    >
      {props.before}
      <AppSidebar navConfig={props.navConfig} chatContent={props.chatContent} />
      <SidebarInset className={isChat ? "overflow-hidden" : undefined}>
        <SidebarHeader
          showSearch={props.showSearch}
          navConfig={props.navConfig}
        />
        <div className="flex min-h-0 min-w-0 flex-1">
          <ContentBoundary>{props.children}</ContentBoundary>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
