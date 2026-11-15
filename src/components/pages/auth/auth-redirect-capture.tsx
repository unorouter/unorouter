"use client";

import {
  AUTH_REDIRECT_COOKIE,
  AUTH_REDIRECT_QUERY,
} from "@/lib/config/constants";
import { sameOriginPath } from "@/lib/utils/client";
import { setCookie } from "cookies-next/client";
import { useQueryState } from "nuqs";
import { useEffect } from "react";

export function AuthRedirectCapture() {
  const [redirect, setRedirect] = useQueryState(AUTH_REDIRECT_QUERY);

  useEffect(() => {
    const target = sameOriginPath(redirect);
    if (!target) return;
    setCookie(AUTH_REDIRECT_COOKIE, target, { maxAge: 600 });
    void setRedirect(null);
  }, [redirect, setRedirect]);

  return null;
}
