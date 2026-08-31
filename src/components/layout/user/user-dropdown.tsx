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
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { useLogoutMutation } from "@/hooks/auth/auth-hook";
import { useSubscriptionSelfQuery } from "@/hooks/billing/billing-hook";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { Link } from "@/i18n/navigation";
import { quotaToDollars } from "@/lib/config/constants";
import { useTranslations } from "next-intl";
import { ReactElement } from "react";
import { DataSubmenu } from "./data-submenu";
import { UserInfo } from "./user-info";

interface UserDropdownProps {
  children: ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
  triggerId?: string;
}

export function UserDropdown(props: UserDropdownProps) {
  const t = useTranslations();
  const userDisplay = useUserDisplay();
  const logoutMutation = useLogoutMutation();
  const subQuery = useSubscriptionSelfQuery();

  const activeSubs = (subQuery.data?.subscriptions ?? []).flatMap((s) =>
    s.subscription?.status === "active"
      ? [{ ...s, subscription: s.subscription }]
      : [],
  );

  if (!userDisplay.user) return null;

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
      window.location.reload();
    } catch {}
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id={props.triggerId}
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
            <UserInfo className="px-1 py-1.5 text-left text-sm" />
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        {activeSubs.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="flex flex-col gap-2 px-2 py-1.5">
              <div className="flex items-center gap-2 text-xs">
                <Icon
                  name="sparkles"
                  className="text-muted-foreground h-3.5 w-3.5"
                />
                <span className="text-muted-foreground">
                  {t("AUTH.SUBSCRIPTION")}
                </span>
                <Badge variant="default" className="h-4 px-1.5 text-[10px]">
                  {t("AUTH.SUBSCRIPTION_ACTIVE")}
                </Badge>
                <span className="text-muted-foreground ml-auto font-mono tabular-nums">
                  {activeSubs.length}
                </span>
              </div>
              {activeSubs.map((summary) => {
                const sub = summary.subscription;
                const total = quotaToDollars(sub.amount_total);
                const used = quotaToDollars(sub.amount_used);
                const percentage =
                  total > 0 ? Math.min((used / total) * 100, 100) : 0;
                const title = summary.plan_title || `#${sub.plan_id}`;
                return (
                  <div key={sub.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-foreground truncate">{title}</span>
                      {total > 0 && (
                        <span className="text-muted-foreground ml-auto font-mono tabular-nums">
                          ${used.toFixed(2)} / ${total.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {total > 0 && (
                      <Progress value={percentage} className="h-1.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {sidebarNavigation(
            (userDisplay.user?.topup_bonus_percent ?? 0) > 0,
          ).map((item) => (
            <Link key={String(item.href)} href={item.href}>
              <DropdownMenuItem>
                {item.iconName && <Icon name={item.iconName} />}
                {item.iconComponent && <item.iconComponent />}
                {t(item.name)}
              </DropdownMenuItem>
            </Link>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DataSubmenu />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <Icon name="log-out" />
          {t("AUTH.LOG_OUT")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
