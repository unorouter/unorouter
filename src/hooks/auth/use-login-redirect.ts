"use client";

import { useRouter, usePathname } from "@/i18n/navigation";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { setCookie } from "cookies-next";

// Client-side counterpart to redirectToLogin() in lib/utils/server: parks where
// the user was so the (auth) layout can send them back after login. Callers
// pass an explicit target when the current pathname is not the place to return
// to (a static marketing page sending its own route, say).
export function useLoginRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  return (target?: string) => {
    setCookie(AUTH_REDIRECT_COOKIE, target ?? pathname, { maxAge: 300 });
    router.push("/login");
  };
}
