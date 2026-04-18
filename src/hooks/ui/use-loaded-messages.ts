"use client";

import { setScrollControl } from "@/store/chat-store";
import { useEffect } from "react";

/** Shared ref for the thread viewport element. Set by Thread, read elsewhere. */
export const viewportRef: React.RefObject<HTMLDivElement | null> = {
  current: null,
};

/**
 * Scrolls the page to the bottom whenever a thread's messages are initially
 * loaded by the history adapter. The adapter seeds the react-query cache;
 * we just react to it here.
 */
export function useLoadedMessages(
  threadId: string,
  remoteId: string | undefined,
) {
  // Infinite-scroll controls are disabled for now — history adapter loads all pages.
  setScrollControl({
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
  });

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
