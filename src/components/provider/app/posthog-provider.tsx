"use client";

import { useAuthUser } from "@/hooks/auth/auth-hook";
import { IS_DEV, POSTHOG_DISABLED } from "@/lib/config/constants";
import { posthog } from "@/lib/posthog-lazy";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Module scope, not a ref: the provider itself remounts (route groups, the
// error boundary), and a ref resets with it, which is how one visitor billed
// 44 views of one path in half an hour. A real revisit is still counted; only
// a repeat of the same path within the window is treated as a remount.
const SAME_PATH_WINDOW_MS = 30_000;
let lastCapturedPath: string | null = null;
let lastCapturedAt = 0;

function PostHogPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (IS_DEV || !pathname) return;
    const now = Date.now();
    if (
      pathname === lastCapturedPath &&
      now - lastCapturedAt < SAME_PATH_WINDOW_MS
    ) {
      return;
    }
    lastCapturedPath = pathname;
    lastCapturedAt = now;
    // Path only, never search params: nuqs rewrites the query on every filter
    // keystroke, and keying on it billed /models at 12-22 pageviews per visitor
    // against the 1M/month tier while every other page sat at 2.5.
    posthog.capture("$pageview", { $current_url: window.origin + pathname });
  }, [pathname]);

  return null;
}

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
      <PostHogPageView />
      <PostHogIdentify />
      {props.children}
    </>
  );
}
