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
  isActiveLink,
  navigation,
  sidebarNavigation,
} from "@/components/layout/nav/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function SidebarNavigation() {
  const t = useTranslations();
  const pathname = usePathname();

  const navItems = sidebarNavigation();
  const sidebarPaths = new Set(navItems.map((item) => item.href));
  const mainNavItems = navigation().filter(
    (item) => !item.submenu && !sidebarPaths.has(item.href),
  );

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>{t("SIDEBAR.MENU")}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = isActiveLink(pathname, item.href);
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
      <SidebarGroup>
        <SidebarGroupLabel>{t("SIDEBAR.NAVIGATE")}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {mainNavItems.map((item) => {
              const isActive = isActiveLink(pathname, item.href);
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
    </>
  );
}
