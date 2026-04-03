import { useEffect, type RefObject } from "react";

const VIEWPORT_SELECTOR = ".aui-thread-viewport";
const SCROLL_THRESHOLD = 200;

/**
 * Triggers `fetchMore` when the user scrolls near the top of the chat viewport.
 * Used for loading older message pages in infinite scroll.
 */
export function useScrollLoadMore(
  containerRef: RefObject<HTMLDivElement | null>,
  hasMore: boolean | undefined,
  isFetching: boolean | undefined,
  fetchMore: (() => void) | undefined,
) {
  useEffect(() => {
    if (!hasMore || !fetchMore) return;
    const viewport = containerRef.current?.querySelector(VIEWPORT_SELECTOR);
    if (!viewport) return;

    const onScroll = () => {
      if (viewport.scrollTop < SCROLL_THRESHOLD && !isFetching) {
        fetchMore();
      }
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [containerRef, hasMore, isFetching, fetchMore]);
}
