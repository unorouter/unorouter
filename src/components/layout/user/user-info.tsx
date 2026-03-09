"use client";

import { Badge } from "@/components/ui/badge";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { UserAvatar } from "./user-avatar";

interface UserInfoProps {
  className?: string;
  avatarClassName?: string;
  showBadge?: boolean;
  badgePosition?: "inline" | "below";
  trailing?: React.ReactNode;
}

export function UserInfo(props: UserInfoProps) {
  const t = useTranslations();
  const userDisplay = useUserDisplay();

  if (!userDisplay.user) return null;

  const badge = props.showBadge !== false && userDisplay.roleKey && (
    <Badge variant="secondary" className="text-xs">
      {t(userDisplay.roleKey)}
    </Badge>
  );

  return (
    <div className={cn("flex flex-col gap-2", props.className)}>
      <div className="flex items-center gap-2">
        <UserAvatar className={props.avatarClassName} />
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="text-foreground truncate font-medium">
            {userDisplay.displayName}
          </span>
        </div>
        {props.trailing}
      </div>
      {(badge || userDisplay.balanceDisplay) && (
        <div className="flex items-center justify-between gap-2">
          {badge && <div className="flex flex-wrap gap-1">{badge}</div>}
          {userDisplay.balanceDisplay && (
            <span className="text-muted-foreground ml-auto shrink-0 font-mono text-xs tabular-nums">
              {userDisplay.balanceDisplay}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
