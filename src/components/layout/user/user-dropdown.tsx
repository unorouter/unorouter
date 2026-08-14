"use client";

import { sidebarNavigation } from "@/components/layout/nav/navigation";
import { Icon } from "@/components/ui/icon";
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
import { useLogoutMutation } from "@/hooks/auth/auth-hook";
import { useSubscriptionSelfQuery } from "@/hooks/billing/billing-hook";
import { useHydrated } from "@/hooks/ui/use-hydrated";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ReactElement } from "react";
import { UserInfo } from "./user-info";
import { quotaToDollars } from "@/lib/config/constants";

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
  // Base UI's Menu.Trigger decorates the trigger button with interactive attrs
  // (disabled/aria-controls/handlers) only on the client, so mounting it during
  // hydration mismatches the server-rendered button. Render the plain child
  // button first, swap in the interactive dropdown after hydration.
  const mounted = useHydrated();

  const activeSubs = (subQuery.data?.subscriptions ?? []).filter(
    (s): s is typeof s & { subscription: NonNullable<typeof s.subscription> } =>
      !!s.subscription && s.subscription.status === "active",
  );

  // Until mounted, render ONLY the plain child button - identical on the server
  // and the first client render, regardless of auth-cache timing - so hydration
  // never compares the server-rendered button against the Base UI trigger (which
  // decorates it with client-only attrs) or against a null (auth not yet in the
  // client cache). The interactive dropdown mounts after hydration.
  if (!mounted) return props.children;

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
            <UserInfo
              className="px-1 py-1.5 text-left text-sm"
              badgePosition="below"
            />
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
          {sidebarNavigation().map((item) => (
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
        <DropdownMenuItem onClick={handleLogout}>
          <Icon name="log-out" />
          {t("AUTH.LOG_OUT")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
