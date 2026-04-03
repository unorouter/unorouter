import type { UIMessage } from "ai";
import { useEffect, useRef, type RefObject } from "react";

const VIEWPORT_SELECTOR = ".aui-thread-viewport";

/**
 * Preserves scroll position when older messages are prepended to the chat.
 * Detects when message count increases, saves scrollHeight before the DOM update,
 * then polls for the height change and restores the user's scroll offset.
 * Temporarily disables smooth scrolling and overrides assistant-ui's autoScroll.
 */
export function usePrependScroll(
  containerRef: RefObject<HTMLDivElement | null>,
  messages: UIMessage[],
  setMessages: (messages: UIMessage[]) => void,
) {
  const prevCountRef = useRef(messages.length);

  useEffect(() => {
    const newCount = messages.length;
    if (newCount <= prevCountRef.current || prevCountRef.current === 0) {
      prevCountRef.current = newCount;
      return;
    }
    prevCountRef.current = newCount;

    const viewport = containerRef.current?.querySelector(VIEWPORT_SELECTOR);
    if (!viewport) return;

    const prevScrollHeight = viewport.scrollHeight;
    const prevScrollTop = viewport.scrollTop;
    viewport.classList.remove("scroll-smooth");

    setMessages(messages);

    // Poll for DOM height change, then restore scroll position.
    // Override multiple frames to beat assistant-ui's autoScroll.
    let attempts = 0;
    const poll = () => {
      const newScrollHeight = viewport.scrollHeight;
      if (newScrollHeight !== prevScrollHeight) {
        const target = prevScrollTop + (newScrollHeight - prevScrollHeight);
        viewport.scrollTop = target;
        let overrides = 0;
        const keep = () => {
          viewport.scrollTop = target;
          if (++overrides < 10) requestAnimationFrame(keep);
          else viewport.classList.add("scroll-smooth");
        };
        requestAnimationFrame(keep);
        return;
      }
      if (++attempts < 30) requestAnimationFrame(poll);
      else viewport.classList.add("scroll-smooth");
    };
    requestAnimationFrame(poll);
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps
}
