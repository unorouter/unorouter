"use client";

import { logger } from "@/lib/utils/logger";
import { useEffect } from "react";
import { drainPending } from "./pending-sync";
import { acquireLock, releaseLock } from "./resource-lock";

// Periodic drain so pending mirror writes don't sit idle until the next
// hydrator run. Runs only while the tab is visible (bails on hidden via
// visibilitychange) and also fires immediately when the tab regains focus
// or the browser reports network online.

const DRAIN_INTERVAL_MS = 60_000;

async function safeDrain(userId: number): Promise<void> {
  // Cross-tab mutex: only one tab drains at a time. Other tabs short-
  // circuit until the lock holder releases.
  const lockKey = `drain:${userId}`;
  if (!acquireLock(lockKey)) return;
  try {
    await drainPending(userId);
  } catch (err) {
    logger.warn("Scheduled drainPending failed", {
      context: "local-db.scheduler",
      userId,
      error: String(err),
    });
  } finally {
    releaseLock(lockKey);
  }
}

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
        // Drain immediately on resume; throttle further runs through start().
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
