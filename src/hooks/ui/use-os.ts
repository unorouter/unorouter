"use client";

import { osAtom } from "@/store/docs-store";
import { useAtom } from "jotai";
import * as React from "react";

export function useOS() {
  const [os, setOs] = useAtom(osAtom);

  React.useEffect(() => {
    if (os) return;
    const ua = navigator.userAgent;
    if (ua.includes("Win")) {
      setOs("windows");
    } else if (ua.includes("Mac")) {
      setOs("macos");
    } else {
      setOs("linux");
    }
  }, [os, setOs]);

  return [os, setOs] as const;
}
