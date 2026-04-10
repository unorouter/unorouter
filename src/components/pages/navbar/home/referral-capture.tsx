"use client";

import { AFF_CODE_KEY, COOKIE_MAX_AGE } from "@/lib/config/constants";
import { setCookie } from "cookies-next/client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function ReferralCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setCookie(AFF_CODE_KEY, ref, { maxAge: COOKIE_MAX_AGE });
      // router.push("/register");
      const params = new URLSearchParams(searchParams.toString());
      params.delete("ref");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query
          ? `${window.location.pathname}?${query}`
          : window.location.pathname,
      );
    }
  }, [searchParams]);

  return null;
}
