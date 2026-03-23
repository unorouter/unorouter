"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand";
import type { NavigationItem } from "@/components/layout/nav/navigation";
import { DocsSearch } from "@/components/layout/docs/docs-search";
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

export type SidebarNavConfig = "default" | "docs";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navConfig?: SidebarNavConfig;
}

export function AppSidebar(props: AppSidebarProps) {
  const { navConfig = "default", ...sidebarProps } = props;
  const isDocs = navConfig === "docs";

  return (
    <Sidebar collapsible={isDocs ? "offcanvas" : "icon"} {...sidebarProps}>
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
        {isDocs && (
          <div className="px-2 pt-2">
            <DocsSearch />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarNavigation navConfig={navConfig} />
      </SidebarContent>
    </Sidebar>
  );
}
