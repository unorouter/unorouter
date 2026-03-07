"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthQuery, useLogoutMutation } from "@/hooks/auth-hook";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { LuLayoutDashboard, LuLogIn, LuLogOut } from "react-icons/lu";
import { PiDotsThreeVerticalBold } from "react-icons/pi";

const ROLE_LABELS: Record<number, string> = {
  100: "AUTH.ROLE_ROOT",
  10: "AUTH.ROLE_ADMIN",
  1: "AUTH.ROLE_USER",
  0: "AUTH.ROLE_GUEST",
};

export function SidebarUser() {
  const t = useTranslations();
  const { isMobile } = useSidebar();
  const { data: user } = useAuthQuery();
  const logoutMutation = useLogoutMutation();

  if (!user) {
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

  const displayName = user.display_name || user.username || "";
  const initials = displayName.charAt(0).toUpperCase();
  const roleKey = ROLE_LABELS[user.role];

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
      window.location.reload();
    } catch {
      // error handled by mutation
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
              <span className="text-foreground text-xs font-bold">
                {initials}
              </span>
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              {user.group && (
                <span className="text-muted-foreground truncate text-xs">
                  {user.group}
                </span>
              )}
            </div>
            <PiDotsThreeVerticalBold className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
            className="min-w-56 rounded-lg"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <span className="text-foreground text-xs font-bold">
                      {initials}
                    </span>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="text-foreground truncate font-medium">
                      {displayName}
                    </span>
                    {roleKey && (
                      <Badge
                        variant="secondary"
                        className="mt-0.5 w-fit text-xs"
                      >
                        {t(roleKey as any)}
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  window.open(process.env.NEXT_PUBLIC_API_URL, "_blank");
                }}
              >
                <LuLayoutDashboard />
                {t("AUTH.DASHBOARD")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LuLogOut />
              {t("AUTH.LOG_OUT")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
