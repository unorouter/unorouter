"use client";

import { UserInfo } from "@/components/layout/user/user-info";
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
            <UserInfo
              showBadge={false}
              trailing={
                <PiDotsThreeVerticalBold className="ml-auto size-4" />
              }
            />
          </SidebarMenuButton>
        </UserDropdown>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
