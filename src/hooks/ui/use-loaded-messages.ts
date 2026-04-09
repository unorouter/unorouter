"use client";

import { mapRawMessages } from "@/components/pages/chat/utils/chat-utils";
import { useMessagesInfiniteQuery } from "@/hooks/chat-hook";
import { setScrollControl } from "@/store/chat-store";
import type { UIMessage } from "ai";
import { useLayoutEffect, useRef } from "react";

/** Shared ref for the thread viewport element. Set by Thread, read by useLoadedMessages. */
export const viewportRef: React.RefObject<HTMLDivElement | null> = {
  current: null,
};

/**
 * Feeds loaded messages from the infinite query into useChat's setMessages,
 * handling both initial load and infinite scroll prepending with scroll anchor restoration.
 */
export function useLoadedMessages(
  threadId: string,
  remoteId: string | undefined,
  setMessages: (messages: UIMessage[]) => void,
) {
  const messagesQuery = useMessagesInfiniteQuery(remoteId);
  const loadedPagesRef = useRef<{ threadId: string; count: number } | null>(
    null,
  );

  // Sync scroll control so Chat component can trigger fetchNextPage without a duplicate observer
  setScrollControl({
    hasNextPage: !!messagesQuery.hasNextPage,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
    fetchNextPage: () => messagesQuery.fetchNextPage(),
  });

  useLayoutEffect(() => {
    if (!remoteId || !messagesQuery.data) return;
    const pageCount = messagesQuery.data.pages.length;
    const prev = loadedPagesRef.current;
    if (prev && prev.threadId === threadId && prev.count === pageCount) return;
    const isPrepend =
      prev?.threadId === threadId && pageCount > (prev?.count ?? 0);
    loadedPagesRef.current = { threadId, count: pageCount };

    const allPages = [...messagesQuery.data.pages].reverse();
    const seen = new Set<string>();
    const messages = mapRawMessages(allPages.flatMap((p) => p.messages)).filter(
      (m) => (seen.has(m.id) ? false : (seen.add(m.id), true)),
    );
    if (messages.length === 0) return;

    const vp = isPrepend ? viewportRef.current : null;

    if (!isPrepend || !vp) {
      setMessages(messages);
      return;
    }

    // Capture anchor before React replaces DOM nodes
    const anchor = vp.querySelector("[data-message-id]") as HTMLElement | null;
    const aid = anchor?.getAttribute("data-message-id");
    const offset = anchor ? anchor.offsetTop - vp.scrollTop : null;
    const msgCount = vp.querySelectorAll("[data-message-id]").length;

    vp.classList.remove("scroll-smooth");
    setMessages(messages);

    // Idempotent: sets scrollTop so anchor stays at its previous visual offset
    const restore = () => {
      const el = aid
        ? (vp.querySelector(`[data-message-id="${aid}"]`) as HTMLElement)
        : null;
      if (el && offset !== null) vp.scrollTop = el.offsetTop - offset;
    };

    // Poll until React renders new messages, then anchor + watch for reflows
    let n = 0;
    const poll = () => {
      if (vp.querySelectorAll("[data-message-id]").length <= msgCount) {
        if (++n < 30) requestAnimationFrame(poll);
        else vp.classList.add("scroll-smooth");
        return;
      }
      restore();
      let h = vp.scrollHeight;
      const obs = new MutationObserver(() => {
        if (vp.scrollHeight !== h) {
          h = vp.scrollHeight;
          restore();
        }
      });
      obs.observe(vp, { childList: true, subtree: true, attributes: true });
      setTimeout(() => {
        obs.disconnect();
        vp.classList.add("scroll-smooth");
      }, 1000);
    };
    requestAnimationFrame(poll);
  }, [messagesQuery.data, threadId, remoteId, setMessages]);

  return messagesQuery;
}
