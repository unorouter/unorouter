"use client";

import { LoginLink } from "@/components/elements/auth/login-link";
import { CompanyName, LogoImage } from "@/components/elements/brand/brand";
import { UserAvatar } from "@/components/layout/user/user-avatar";
import { UserDropdown } from "@/components/layout/user/user-dropdown";
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
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { LuLogIn } from "react-icons/lu";
import { SidebarNavigation } from "./sidebar-navigation";

export type SidebarNavConfig = "default" | "docs" | "chat";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navConfig?: SidebarNavConfig;
  chatContent?: React.ReactNode;
}

export function AppSidebar(props: AppSidebarProps) {
  const { navConfig = "default", chatContent, ...sidebarProps } = props;
  const t = useTranslations();
  const userDisplay = useUserDisplay();

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
      <SidebarFooter className="border-t md:hidden group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          {userDisplay.user ? (
            <UserDropdown side="top" align="end">
              <button
                aria-label={t("COMMON.OPEN_MENU")}
                className="hover:bg-accent cursor-pointer rounded-md p-1 transition-colors"
              >
                <UserAvatar />
              </button>
            </UserDropdown>
          ) : (
            <LoginLink
              aria-label={t("NAV.LOG_IN")}
              className="hover:bg-accent rounded-md p-1 transition-colors"
            >
              <LuLogIn className="size-5" />
            </LoginLink>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
