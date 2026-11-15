"use client";

import { AFF_CODE_KEY, COOKIE_MAX_AGE } from "@/lib/config/constants";
import { setCookie } from "cookies-next/client";
import { useQueryState } from "nuqs";
import { useEffect } from "react";

export function AffiliateCapture() {
  const [affCode, setAffCode] = useQueryState(AFF_CODE_KEY);

  useEffect(() => {
    if (!affCode) return;
    setCookie(AFF_CODE_KEY, affCode, { maxAge: COOKIE_MAX_AGE });
    void setAffCode(null);
  }, [affCode, setAffCode]);

  return null;
}
