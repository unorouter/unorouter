"use client";

import { useRouter } from "@/i18n/navigation";
import { AFF_CODE_KEY, COOKIE_MAX_AGE } from "@/lib/config/constants";
import { setCookie } from "cookies-next/client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function ReferralCapture() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setCookie(AFF_CODE_KEY, ref, { maxAge: COOKIE_MAX_AGE });
      router.push("/register");
    }
  }, [searchParams, router]);

  return null;
}
