"use client";

import { AFF_CODE_KEY, COOKIE_MAX_AGE } from "@/lib/config/constants";
import { setCookie } from "cookies-next/client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function AffiliateCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const affCode = searchParams.get(AFF_CODE_KEY);
    if (affCode) {
      setCookie(AFF_CODE_KEY, affCode, { maxAge: COOKIE_MAX_AGE });
    }
  }, [searchParams]);

  return null;
}
