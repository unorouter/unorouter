"use client";

import { CompanyName, LogoImage } from "@/components/elements/brand";
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
import { SidebarUser } from "./sidebar-user";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
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
        <SidebarNavigation />
      </SidebarContent>
      <SidebarFooter>
        <SidebarUser />
      </SidebarFooter>
    </Sidebar>
  );
}
