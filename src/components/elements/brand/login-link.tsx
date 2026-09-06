"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { currentPathForRedirect } from "@/lib/utils/client";
import { setCookie } from "cookies-next";
import type { ComponentProps } from "react";

type LoginLinkProps = Omit<ComponentProps<typeof Link>, "href">;

const SIDEBAR_REDIRECT_PREFIXES = ["/chat", "/docs"];

export function LoginLink(props: LoginLinkProps) {
  const pathname = usePathname();

  return (
    <Link
      {...props}
      href="/login"
      onClick={(e) => {
        if (SIDEBAR_REDIRECT_PREFIXES.some((p) => pathname.startsWith(p))) {
          setCookie(AUTH_REDIRECT_COOKIE, currentPathForRedirect(), {
            maxAge: 300,
          });
        }
        props.onClick?.(e);
      }}
    />
  );
}
