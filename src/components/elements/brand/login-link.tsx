"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { setCookie } from "cookies-next";
import type { ComponentProps } from "react";

type LoginLinkProps = Omit<ComponentProps<typeof Link>, "href">;

export function LoginLink(props: LoginLinkProps) {
  const pathname = usePathname();

  return (
    <Link
      {...props}
      href="/login"
      onClick={(e) => {
        if (pathname.startsWith("/chat") || pathname.startsWith("/docs")) {
          setCookie(AUTH_REDIRECT_COOKIE, pathname, { maxAge: 300 });
        }
        props.onClick?.(e);
      }}
    />
  );
}
