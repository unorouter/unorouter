"use client";

import { useAuthUser } from "@/hooks/auth/auth-hook";
import { IS_DEV, POSTHOG_DISABLED } from "@/lib/config/constants";
import { posthog } from "@/lib/posthog-lazy";
import { useEffect, useRef } from "react";

function PostHogIdentify() {
  const user = useAuthUser();
  const previousUserId = useRef<number | null>(null);

  useEffect(() => {
    if (IS_DEV) return;

    const userId = user?.id;

    if (userId && previousUserId.current !== userId) {
      posthog.identify(String(userId), {
        display_name: user.display_name,
        username: user.username,
        email: user.email || undefined,
        group: user.group,
        role: user.role,
        has_discord: !!user.discord_id,
        has_github: !!user.github_id,
        has_telegram: !!user.telegram_id,
      });
      previousUserId.current = userId;
    }

    if (!userId && previousUserId.current) {
      posthog.reset();
      previousUserId.current = null;
    }
  }, [user]);

  return null;
}

export function PostHogProvider(props: { children: React.ReactNode }) {
  if (IS_DEV || POSTHOG_DISABLED) {
    return <>{props.children}</>;
  }

  return (
    <>
      <PostHogIdentify />
      {props.children}
    </>
  );
}
