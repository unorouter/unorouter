"use client";

import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { setCookie } from "cookies-next/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const REDIRECT_QUERY_KEY = "redirect";

/**
 * Global listener for `?redirect=<path>` on any page. When present, stashes
 * the path into AUTH_REDIRECT_COOKIE (which the login form already reads on
 * success) and strips the query param so it doesn't bounce through history.
 *
 * Used for flows where a Server Component can't write cookies itself — e.g.
 * /consent sends unauthenticated users to `/login?redirect=/consent?...`
 * and this listener captures the return URL on the way in.
 *
 * Mirrors the shape of AffiliateCapture; mounts in the root layout.
 */
export function AuthRedirectCapture() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const returnUrl = searchParams.get(REDIRECT_QUERY_KEY);
    if (!returnUrl) return;
    if (!returnUrl.startsWith("/")) return; // reject off-site redirects

    setCookie(AUTH_REDIRECT_COOKIE, returnUrl, { maxAge: 600 });

    const cleaned = new URLSearchParams(searchParams.toString());
    cleaned.delete(REDIRECT_QUERY_KEY);
    const qs = cleaned.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return null;
}
