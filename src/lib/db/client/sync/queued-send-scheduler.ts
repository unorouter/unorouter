"use client";

import { findUnansweredUserTurns } from "@/lib/db/client/data/queued-send";
import { logger } from "@/lib/utils/logger";
import { chatStore, queuedReplayAtom } from "@/store/chat-store";
import { useEffect } from "react";

// Detects offline-queued sends (unanswered user turns) and publishes the work
// list to queuedReplayAtom on reconnect / tab focus. The runtime bridge in
// ChatRuntimeHook drains it (only the active thread auto-replays, so cost stays
// visible). Mirrors usePendingDrainScheduler's online/visibility lifecycle, but
// MUST run for guests too (they stream via the guest key), so no userId > 0 bail.

const POLL_INTERVAL_MS = 60_000;

async function publishQueued(userId: number): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const turns = await findUnansweredUserTurns(userId);
    chatStore.set(
      queuedReplayAtom,
      turns.map((turn) => turn.convId),
    );
  } catch (err) {
    logger.warn("Queued-send detection failed", {
      context: "queued-send.scheduler",
      userId,
      error: String(err),
    });
  }
}

export function useQueuedSendScheduler(userId: number | null | undefined) {
  useEffect(() => {
    if (userId == null) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer != null) return;
      timer = setInterval(() => void publishQueued(userId), POLL_INTERVAL_MS);
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
        void publishQueued(userId);
        start();
      }
    };
    const onOnline = () => void publishQueued(userId);

    if (!document.hidden) {
      void publishQueued(userId);
      start();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [userId]);
}
