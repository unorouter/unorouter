"use client";

import { useEffect } from "react";
import { safeDrain } from "./pending-sync";

const DRAIN_INTERVAL_MS = 60_000;

// Periodic retry tick for the outbox: drainSoon handles the happy path right
// after each enqueue; this catches backoff retries + offline recovery.
export function usePendingDrainScheduler(userId: number | null | undefined) {
  useEffect(() => {
    if (userId == null || userId <= 0) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer != null) return;
      timer = setInterval(() => void safeDrain(userId), DRAIN_INTERVAL_MS);
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
        void safeDrain(userId);
        start();
      }
    };
    const onOnline = () => void safeDrain(userId);

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [userId]);
}
