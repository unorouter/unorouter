"use client";

import { docsNavItems } from "@/components/layout/docs/docs-navigation";
import {
  type NavigationItem,
  isActiveLink,
  navigation,
  sidebarNavigation,
} from "@/components/layout/nav/navigation";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuthQuery } from "@/hooks/auth-hook";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { SidebarNavConfig } from "./app-sidebar";

function NavGroup(props: { label: string; items: NavigationItem[] }) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{props.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {props.items.map((item) => {
            const isActive =
              item.href === "/docs"
                ? pathname === "/docs"
                : isActiveLink(pathname, item.href);
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  tooltip={t(item.name)}
                  isActive={isActive}
                  className={cn(
                    isActive && "bg-primary/10 text-primary font-medium",
                  )}
                >
                  {item.icon && (
                    <item.icon
                      className={cn("size-4", isActive && "text-primary")}
                    />
                  )}
                  <span>{t(item.name)}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

interface SidebarNavigationProps {
  navConfig?: SidebarNavConfig;
  chatContent?: React.ReactNode;
}

export function SidebarNavigation(props: SidebarNavigationProps) {
  const t = useTranslations();
  const { data: user } = useAuthQuery();
  const authenticated = !!user;

  if (props.navConfig === "chat") {
    const mainNavItems = navigation(authenticated).filter(
      (item) => !item.hidden && item.href !== "/chat",
    );
    return (
      <>
        {props.chatContent}
        <NavGroup label={t("SIDEBAR.NAVIGATE")} items={mainNavItems} />
      </>
    );
  }

  if (props.navConfig === "docs") {
    const mainNavItems = navigation(authenticated).filter(
      (item) => !item.hidden && item.href !== "/docs",
    );
    return (
      <>
        <NavGroup label={t("DOCS_SIDEBAR.TITLE")} items={docsNavItems} />
        <NavGroup label={t("SIDEBAR.NAVIGATE")} items={mainNavItems} />
      </>
    );
  }

  const navItems = sidebarNavigation();
  const sidebarPaths = new Set(navItems.map((item) => item.href));
  const mainNavItems = navigation(authenticated).filter(
    (item) => !sidebarPaths.has(item.href),
  );

  return (
    <>
      <NavGroup label={t("SIDEBAR.MENU")} items={navItems} />
      <NavGroup label={t("SIDEBAR.NAVIGATE")} items={mainNavItems} />
    </>
  );
}
