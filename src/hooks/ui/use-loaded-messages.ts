"use client";

import { useEffect } from "react";

/**
 * Scrolls the page to the bottom whenever a thread's messages are initially
 * loaded by the history adapter. The adapter seeds the react-query cache;
 * we just react to it here.
 */
export function useLoadedMessages(
  threadId: string,
  remoteId: string | undefined,
) {
  useEffect(() => {
    if (!remoteId) return;
    const scroller = document.querySelector("main");
    if (!scroller) return;
    let n = 0;
    const pin = () => {
      scroller.scrollTop = scroller.scrollHeight;
      if (++n < 10) requestAnimationFrame(pin);
    };
    requestAnimationFrame(pin);
  }, [threadId, remoteId]);
}
