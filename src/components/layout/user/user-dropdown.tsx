"use client";

import { sidebarNavigation } from "@/components/layout/nav/navigation";
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
import { Progress } from "@/components/ui/progress";
import { useLogoutMutation } from "@/hooks/auth-hook";
import { useSubscriptionSelfQuery } from "@/hooks/billing-hook";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { Link } from "@/i18n/navigation";
import { quotaToDollars } from "@/lib/config/constants";
import { useTranslations } from "next-intl";
import { ReactElement } from "react";
import { LuLogOut, LuSparkles } from "react-icons/lu";
import { UserInfo } from "./user-info";

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
  const subQuery = useSubscriptionSelfQuery();

  const activeSub = (subQuery.data?.subscriptions ?? [])
    .map((s) => s.subscription)
    .find((sub) => sub && sub.status === "active");

  const subTotal = activeSub ? quotaToDollars(activeSub.amount_total) : 0;
  const subUsed = activeSub ? quotaToDollars(activeSub.amount_used) : 0;
  const subPercentage =
    activeSub && subTotal > 0 ? Math.min((subUsed / subTotal) * 100, 100) : 0;

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
      <DropdownMenuTrigger
        className={props.className}
        render={props.children}
      ></DropdownMenuTrigger>
      <DropdownMenuContent
        side={props.side ?? "bottom"}
        align={props.align ?? "end"}
        sideOffset={props.sideOffset ?? 4}
        className="min-w-56 rounded-lg"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <UserInfo
              className="px-1 py-1.5 text-left text-sm"
              badgePosition="below"
            />
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        {activeSub && (
          <>
            <DropdownMenuSeparator />
            <div className="flex flex-col gap-1.5 px-2 py-1.5">
              <div className="flex items-center gap-2 text-xs">
                <LuSparkles className="text-muted-foreground h-3.5 w-3.5" />
                <span className="text-muted-foreground">
                  {t("AUTH.SUBSCRIPTION")}
                </span>
                <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                  {t("AUTH.SUBSCRIPTION_ACTIVE")}
                </Badge>
                {subTotal > 0 && (
                  <span className="text-foreground ml-auto font-mono tabular-nums">
                    ${subUsed.toFixed(2)} / ${subTotal.toFixed(2)}
                  </span>
                )}
              </div>
              {subTotal > 0 && (
                <Progress value={subPercentage} className="h-1.5" />
              )}
            </div>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {sidebarNavigation().map((item) => (
            <Link key={String(item.href)} href={item.href}>
              <DropdownMenuItem>
                {item.icon && <item.icon />}
                {t(item.name)}
              </DropdownMenuItem>
            </Link>
          ))}
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
