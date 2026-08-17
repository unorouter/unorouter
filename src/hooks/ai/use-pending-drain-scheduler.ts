"use client";

import { drain } from "@/lib/db/client/outbox/pending/queue";
import { useEffect } from "react";

const DRAIN_INTERVAL_MS = 60_000;

export function usePendingDrainScheduler() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer != null) return;
      timer = setInterval(() => void drain(), DRAIN_INTERVAL_MS);
    };
    const stop = () => {
      if (timer == null) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        void drain();
        start();
      }
    };
    const onOnline = () => void drain();

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, []);
}
