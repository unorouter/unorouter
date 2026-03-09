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
  const mainNavItems = navigation().filter((item) => !item.submenu);

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
                    tooltip={t(item.name as any)}
                    isActive={isActive}
                    className={cn(
                      isActive && "bg-primary/10 text-primary font-medium",
                    )}
                  >
                    <Link
                      href={item.href as any}
                      className="flex items-center gap-2"
                    >
                      {item.icon && (
                        <item.icon
                          className={cn("size-4", isActive && "text-primary")}
                        />
                      )}
                      <span>{t(item.name as any)}</span>
                    </Link>
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
                    tooltip={t(item.name as any)}
                    isActive={isActive}
                    className={cn(
                      isActive && "bg-primary/10 text-primary font-medium",
                    )}
                  >
                    <Link
                      href={item.href as any}
                      className="flex items-center gap-2"
                    >
                      {item.icon && (
                        <item.icon
                          className={cn("size-4", isActive && "text-primary")}
                        />
                      )}
                      <span>{t(item.name as any)}</span>
                    </Link>
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
