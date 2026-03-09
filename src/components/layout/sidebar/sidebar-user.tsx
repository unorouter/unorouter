"use client";

import { UserAvatar } from "@/components/layout/user/user-avatar";
import { UserDropdown } from "@/components/layout/user/user-dropdown";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { LuLogIn } from "react-icons/lu";
import { PiDotsThreeVerticalBold } from "react-icons/pi";

export function SidebarUser() {
  const t = useTranslations();
  const sidebar = useSidebar();
  const userDisplay = useUserDisplay();

  if (!userDisplay.user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <Link href="/login" className="flex items-center gap-2">
              <LuLogIn className="size-4" />
              <span>{t("NAV.LOG_IN")}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <UserDropdown
          side={sidebar.isMobile ? "bottom" : "right"}
          align="end"
        >
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <UserAvatar />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {userDisplay.displayName}
              </span>
              {userDisplay.user.group && (
                <span className="text-muted-foreground truncate text-xs">
                  {userDisplay.user.group}
                </span>
              )}
            </div>
            <PiDotsThreeVerticalBold className="ml-auto size-4" />
          </SidebarMenuButton>
        </UserDropdown>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
