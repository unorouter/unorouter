"use client";

import { AFF_CODE_KEY, COOKIE_MAX_AGE } from "@/lib/config/constants";
import { setCookie } from "cookies-next/client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export function AffiliateCapture() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const affCode = searchParams.get(AFF_CODE_KEY);
    if (!affCode) return;

    setCookie(AFF_CODE_KEY, affCode, { maxAge: COOKIE_MAX_AGE });

    const cleaned = new URLSearchParams(searchParams.toString());
    cleaned.delete(AFF_CODE_KEY);
    const qs = cleaned.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchParams, router, pathname]);

  return null;
}
