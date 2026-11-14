"use client";

import { pullToRefreshAtom } from "@/store/chat-store";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

export function PullToRefresh() {
  const enabled = useAtomValue(pullToRefreshAtom);
  useEffect(() => {
    document.documentElement.classList.toggle("pull-to-refresh", enabled);
  }, [enabled]);
  return null;
}
