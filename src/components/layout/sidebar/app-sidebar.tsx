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
import { env } from "@/lib/config/env";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import * as React from "react";
import { SidebarNavigation } from "./sidebar-navigation";

export type SidebarNavConfig = "default" | "docs" | "chat" | "generate";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navConfig?: SidebarNavConfig;
  chatContent?: React.ReactNode;
}

export function AppSidebar(props: AppSidebarProps) {
  const { navConfig = "default", chatContent, ...sidebarProps } = props;
  const t = useTranslations();

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
      {navConfig === "chat" || navConfig === "generate" ? (
        <>
          <SidebarNavigation navConfig={navConfig} />
          {chatContent}
        </>
      ) : (
        <SidebarContent>
          <SidebarNavigation navConfig={navConfig} />
        </SidebarContent>
      )}
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={t("FOOTER.STATUS")}
              render={
                <NextLink
                  href={env.statusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-2 group-data-[collapsible=icon]:justify-center"
                >
                  <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  </span>
                  <span className="group-data-[collapsible=icon]:hidden">
                    {t("FOOTER.STATUS")}
                  </span>
                </NextLink>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center gap-1 px-1 group-data-[collapsible=icon]:hidden md:hidden">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
