"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand/brand";
import type { NavigationItem } from "@/components/layout/nav/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link } from "@/i18n/navigation";
import * as React from "react";
import { SidebarNavigation } from "./sidebar-navigation";

export type SidebarNavConfig = "default" | "docs" | "chat";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navConfig?: SidebarNavConfig;
  chatContent?: React.ReactNode;
}

export function AppSidebar(props: AppSidebarProps) {
  const { navConfig = "default", chatContent, ...sidebarProps } = props;

  return (
    <Sidebar collapsible="icon" {...sidebarProps}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="py-0"
              render={
                <Link
                  href="/"
                  className="flex w-full items-center gap-2 group-data-[collapsible=icon]:justify-center"
                >
                  <LogoImage className="shrink-0" width={28} height={28} />
                  <CompanyName className="text-lg group-data-[collapsible=icon]:hidden" />
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarNavigation navConfig={navConfig} chatContent={chatContent} />
      </SidebarContent>
    </Sidebar>
  );
}
