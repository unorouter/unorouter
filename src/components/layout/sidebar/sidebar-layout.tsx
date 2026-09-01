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
  const isChat = props.navConfig === "chat" || props.navConfig === "generate";

  return (
    <SidebarProvider
      open={open}
      onOpenChange={(next) => {
        analytics.navigation.sidebarToggled(next);
        setOpen(next);
      }}
      // Marks the subtree the theme's chat palette applies to. Image generation
      // counts: it is the same creative surface, and neither is the model list.
      data-theme-scope={isChat ? "chat" : undefined}
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
        {/* Chat owns its own scroll area, so it stays clamped to the viewport.
            Everywhere else the row must grow to its content: a sticky child
            cannot outlive its parent's box, so clamping it to one screen made
            the docs tab bar scroll away at the first viewport boundary. */}
        <div
          className={cn(
            "flex min-w-0",
            isChat ? "min-h-0 flex-1" : "min-h-0 flex-1 md:min-h-fit",
          )}
        >
          <ContentBoundary>{props.children}</ContentBoundary>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
