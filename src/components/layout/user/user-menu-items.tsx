"use client";

import { useLogoutMutation } from "@/hooks/auth-hook";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { LuLayoutDashboard, LuLogOut, LuWallet } from "react-icons/lu";

interface UserMenuItemsProps {
  className?: string;
  itemClassName?: string;
  onAction?: () => void;
}

export function UserMenuItems(props: UserMenuItemsProps) {
  const t = useTranslations();
  const userDisplay = useUserDisplay();
  const logoutMutation = useLogoutMutation();

  if (!userDisplay.user) return null;

  async function handleLogout() {
    props.onAction?.();
    try {
      await logoutMutation.mutateAsync();
      window.location.reload();
    } catch {
      // error handled by mutation
    }
  }

  const itemClass = cn(
    "text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm",
    props.itemClassName,
  );

  return (
    <div className={cn("flex flex-col gap-3", props.className)}>
      {userDisplay.balanceDisplay && (
        <div className="flex items-center gap-2 text-sm">
          <LuWallet className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-muted-foreground text-xs">
            {t("AUTH.BALANCE")}
          </span>
          <span className="ml-auto font-mono text-xs font-medium tabular-nums">
            {userDisplay.balanceDisplay}
          </span>
        </div>
      )}
      <a
        href={process.env.NEXT_PUBLIC_API_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={props.onAction}
        className={itemClass}
      >
        <LuLayoutDashboard className="h-3.5 w-3.5" />
        {t("AUTH.DASHBOARD")}
      </a>
      <button onClick={handleLogout} className={itemClass}>
        <LuLogOut className="h-3.5 w-3.5" />
        {t("AUTH.LOG_OUT")}
      </button>
    </div>
  );
}
