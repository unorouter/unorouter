"use client";

import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  className?: string;
}

export function UserAvatar(props: UserAvatarProps) {
  const userDisplay = useUserDisplay();

  if (!userDisplay.user) return null;

  return (
    <div
      className={cn(
        "bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg",
        props.className,
      )}
    >
      <span className="text-foreground text-xs font-bold">
        {userDisplay.initials}
      </span>
    </div>
  );
}
