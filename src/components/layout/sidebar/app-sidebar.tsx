"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand/brand";
import { LanguageToggle } from "@/components/toggle/language-toggle";
import { ThemeToggle } from "@/components/toggle/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
      {navConfig === "chat" ? (
        <>
          <SidebarNavigation navConfig={navConfig} />
          {chatContent}
        </>
      ) : (
        <SidebarContent>
          <SidebarNavigation navConfig={navConfig} />
        </SidebarContent>
      )}
      <SidebarFooter className="border-t group-data-[collapsible=icon]:hidden md:hidden">
        <div className="flex items-center gap-1 px-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
