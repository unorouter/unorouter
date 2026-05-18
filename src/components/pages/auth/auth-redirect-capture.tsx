"use client";

import {
  AUTH_REDIRECT_COOKIE,
  AUTH_REDIRECT_QUERY,
} from "@/lib/config/constants";
import { setCookie } from "cookies-next/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

// Captures `?redirect=<path>` from any page (e.g. server-rendered /consent
// bouncing to /login), stashes it into AUTH_REDIRECT_COOKIE for the login
// form to consume, then strips the query so it doesn't replay through history.
export function AuthRedirectCapture() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const target = searchParams.get(AUTH_REDIRECT_QUERY);
    if (!target?.startsWith("/")) return;
    setCookie(AUTH_REDIRECT_COOKIE, target, { maxAge: 600 });
    const next = new URLSearchParams(searchParams.toString());
    next.delete(AUTH_REDIRECT_QUERY);
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return null;
}
