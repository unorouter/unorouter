"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  type NavigationItem,
  isActiveLink,
  navigation,
  sidebarNavigation,
} from "@/components/layout/nav/navigation";
import { docsNavItems } from "@/components/layout/docs/docs-navigation";
import type { SidebarNavConfig } from "./app-sidebar";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

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
                  render={<Link href={item.href as any} />}
                  tooltip={t(item.name as any)}
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
                  <span>{t(item.name as any)}</span>
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
}

export function SidebarNavigation(props: SidebarNavigationProps) {
  const t = useTranslations();

  if (props.navConfig === "docs") {
    return <NavGroup label={t("DOCS_SIDEBAR.TITLE")} items={docsNavItems} />;
  }

  const navItems = sidebarNavigation();
  const sidebarPaths = new Set(navItems.map((item) => item.href));
  const mainNavItems = navigation().filter(
    (item) => !item.submenu && !sidebarPaths.has(item.href),
  );

  return (
    <>
      <NavGroup label={t("SIDEBAR.MENU")} items={navItems} />
      <NavGroup label={t("SIDEBAR.NAVIGATE")} items={mainNavItems} />
    </>
  );
}
