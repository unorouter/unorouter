"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { IS_DEV, POSTHOG_DISABLED } from "@/lib/config/constants";
import { posthog } from "@/lib/posthog-lazy";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (IS_DEV || !pathname) return;

    let url = window.origin + pathname;
    if (searchParams?.toString()) {
      url = url + `?${searchParams.toString()}`;
    }
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

function PostHogIdentify() {
  const authQuery = useAuthQuery();
  const previousUserId = useRef<number | null>(null);

  useEffect(() => {
    if (IS_DEV) return;

    const user = authQuery.data;
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
  }, [authQuery.data]);

  return null;
}

export function PostHogProvider(props: { children: React.ReactNode }) {
  if (IS_DEV || POSTHOG_DISABLED) {
    return <>{props.children}</>;
  }

  return (
    <>
      {/* useSearchParams needs its own boundary or every prerendered page bails out of the static shell */}
      <Suspense>
        <PostHogPageView />
      </Suspense>
      <PostHogIdentify />
      {props.children}
    </>
  );
}
