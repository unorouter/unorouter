"use client";

import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { cn } from "@/lib/utils";
import { LuUser } from "react-icons/lu";

interface UserAvatarProps {
  className?: string;
}

export function UserAvatar(props: UserAvatarProps) {
  const userDisplay = useUserDisplay();

  if (!userDisplay.user) return null;

  return (
    <LuUser
      className={cn("size-4 shrink-0", props.className)}
    />
  );
}
