"use client";

import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { deleteCookie } from "cookies-next/client";
import { useEffect } from "react";

export function AuthRedirectCleanup() {
  useEffect(() => {
    deleteCookie(AUTH_REDIRECT_COOKIE);
  }, []);
  return null;
}
