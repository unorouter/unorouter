"use client";

import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { cn } from "@/lib/utils";
import { LuUser } from "react-icons/lu";

interface UserAvatarProps {
  className?: string;
  variant?: "icon" | "initials";
}

export function UserAvatar(props: UserAvatarProps) {
  const userDisplay = useUserDisplay();
  const variant = props.variant ?? "icon";

  if (!userDisplay.user) return null;

  if (variant === "initials") {
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

  return (
    <LuUser className={cn("size-4 shrink-0", props.className)} />
  );
}
