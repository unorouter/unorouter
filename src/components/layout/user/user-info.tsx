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
          {userDisplay.user.group && (
            <span className="text-muted-foreground truncate text-xs">
              {userDisplay.user.group}
            </span>
          )}
        </div>
        {props.badgePosition !== "below" && badge}
        {props.trailing}
      </div>
      {props.badgePosition === "below" && badge && (
        <div className="flex flex-wrap gap-1">{badge}</div>
      )}
    </div>
  );
}
