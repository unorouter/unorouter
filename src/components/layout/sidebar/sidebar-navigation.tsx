"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { type IconType } from "react-icons/lib";
import { LuLayoutDashboard } from "react-icons/lu";

type NavItem = {
  name: string;
  href: string;
  icon: IconType;
};

const NAV_ITEMS: NavItem[] = [
  {
    name: "SIDEBAR.DASHBOARD",
    href: "/dashboard",
    icon: LuLayoutDashboard,
  },
];

export function SidebarNavigation() {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("SIDEBAR.MENU")}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
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
                    <item.icon
                      className={cn("size-4", isActive && "text-primary")}
                    />
                    <span>{t(item.name as any)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
