"use client";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogoutMutation } from "@/hooks/auth-hook";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { useTranslations } from "next-intl";
import { ReactElement } from "react";
import { LuLayoutDashboard, LuLogOut, LuWallet } from "react-icons/lu";
import { UserAvatar } from "./user-avatar";

interface UserDropdownProps {
  children: ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
}

export function UserDropdown(props: UserDropdownProps) {
  const t = useTranslations();
  const userDisplay = useUserDisplay();
  const logoutMutation = useLogoutMutation();

  if (!userDisplay.user) return null;

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
      window.location.reload();
    } catch {
      // error handled by mutation
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={props.className} render={props.children}>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={props.side ?? "bottom"}
        align={props.align ?? "end"}
        sideOffset={props.sideOffset ?? 4}
        className="min-w-56 rounded-lg"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex flex-col gap-2 px-1 py-1.5 text-left text-sm">
              <div className="flex items-center gap-2">
                <UserAvatar />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="text-foreground truncate font-medium">
                    {userDisplay.displayName}
                  </span>
                  {userDisplay.user.group && (
                    <span className="text-muted-foreground truncate text-xs">
                      {userDisplay.user.group}
                    </span>
                  )}
                </div>
              </div>
              {userDisplay.roleKey && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <Badge variant="secondary" className="text-xs">
                    {t(userDisplay.roleKey)}
                  </Badge>
                </div>
              )}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {userDisplay.balanceDisplay && (
            <DropdownMenuItem disabled className="opacity-100">
              <LuWallet />
              <span className="text-muted-foreground text-xs">
                {t("AUTH.BALANCE")}
              </span>
              <span className="ml-auto font-mono text-xs font-medium tabular-nums">
                {userDisplay.balanceDisplay}
              </span>
            </DropdownMenuItem>
          )}
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
  );
}
