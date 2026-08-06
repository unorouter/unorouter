"use client";

import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { useEffect } from "react";

// iOS Safari diagnostics + recovery. The chat layout itself is CSS-only: a
// dvh-sized shell with ONE inner scroller and the composer sticky INSIDE that
// scroller (thread.tsx / sidebar.tsx). When the keyboard opens, Safari pans
// the visual viewport and scrolls the focused field's scroll container; the
// sticky footer rides up in the same native pass, so nothing here resizes,
// scrolls, or repositions anything while the user is typing. (A previous
// design mirrored visualViewport.height into a --vvh cap on the thread root;
// resizing the shell to the visual viewport is the one thing no working
// reference client does, and it fought Safari's own keyboard handling.)
//
// What remains: (a) viewport/scroller geometry logged into the exportable
// chat-debug log so a user report comes with data, (b) a recomposite nudge on
// the triggers where iOS 26 leaves stale/blank composited tiles (keyboard,
// URL-bar, content shrink), (c) a reset for the stuck visual-viewport offset
// WebKit 297779 leaves behind after a keyboard dismiss. No-op off iOS.
export function ViewportDebugLogger() {
  useEffect(() => {
    const isIos = /iP(hone|ad|od)/.test(navigator.userAgent);
    // Off iOS the ResizeObserver fired per content-shrink (every reasoning-box
    // collapse / streaming reflow), each a synchronous full-buffer
    // localStorage write in logChatDebug - a main-thread storm that froze
    // desktop chat. Bail before wiring anything when not on iOS.
    if (!isIos) return;

    const geometry = () => {
      const scroller = document.querySelector<HTMLElement>(
        ".aui-thread-viewport",
      );
      const vv = window.visualViewport;
      return {
        innerH: window.innerHeight,
        vvH: vv ? Math.round(vv.height) : null,
        vvOffsetTop: vv ? Math.round(vv.offsetTop) : null,
        scrollerH: scroller?.clientHeight ?? null,
        scrollerScrollH: scroller?.scrollHeight ?? null,
        docHidden: document.hidden,
        // The black-out signature: the scroll container is taller than the
        // visible viewport, so content sits below the fold with no repaint.
        mismatch: !!vv && !!scroller && scroller.clientHeight > vv.height + 4,
      };
    };

    // Repaint without transforms: a transform toggle desyncs Safari's caret
    // hit-testing while the composer is focused, but a same-position scroll
    // jiggle still forces stale composited tiles to repaint and never moves
    // any geometry.
    const repaintScroll = () => {
      const scroller = document.querySelector<HTMLElement>(
        ".aui-thread-viewport",
      );
      if (!scroller) return;
      const top = scroller.scrollTop;
      scroller.scrollTop = top + 1;
      scroller.scrollTop = top;
    };

    const nudge = () => {
      const scroller = document.querySelector<HTMLElement>(
        ".aui-thread-viewport",
      );
      if (!scroller) return;
      repaintScroll();
      scroller.style.transform = "translateZ(0)";
      requestAnimationFrame(() => {
        scroller.style.transform = "";
      });
    };

    const composerFocused = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLElement &&
        (el.tagName === "TEXTAREA" ||
          el.tagName === "INPUT" ||
          el.isContentEditable)
      );
    };

    // iOS 26 leaves `visualViewport.offsetTop` stuck > 0 after a keyboard
    // dismiss or pinch-zoom-out (WebKit 297779, only partially fixed in 26.1),
    // so the whole shell sits too low with the composer cut off until the user
    // swipes the page itself - a window-level scroll resets it. The scrollBy
    // jiggle is the automated version of that swipe. The chat shell is a
    // full-height overflow-hidden box, so any window scroll is the same stuck
    // state; send it back to 0 too. Skip while pinch-zoomed: a panned viewport
    // legitimately has offsetTop > 0.
    const realignStuckViewport = () => {
      const vv = window.visualViewport;
      if (!vv || vv.scale > 1.01) return;
      if (window.scrollY > 0) window.scrollTo(0, 0);
      if (vv.offsetTop <= 0) return;
      window.scrollBy(0, -1);
      window.scrollBy(0, 1);
    };

    const onTrigger = (reason: string) => {
      logChatDebug("viewport.change", { reason, ios: isIos, ...geometry() });
      // The recompositing nudge toggles a transform on the scroll ancestor,
      // which desyncs the textarea caret hit-testing WHILE typing. While
      // focused, only the transform-free repaint runs; content-shrink fires
      // mid-typing whenever a reasoning box collapses during a stream.
      requestAnimationFrame(composerFocused() ? repaintScroll : nudge);
      // Realign the stuck viewport (shell too low after a keyboard dismiss or
      // zoom-out). NOT while the composer is focused: with the keyboard up an
      // offsetTop > 0 is Safari's own reveal pan and must be left alone -
      // fighting it mid-typing is what desyncs the caret. focusout /
      // zoom-settle are the real dismiss signals.
      if (!composerFocused()) {
        requestAnimationFrame(realignStuckViewport);
      }
    };

    const onVvResize = () => onTrigger("vv-resize");
    const onFocusOut = () => setTimeout(() => onTrigger("focusout"), 100);
    const onVisibility = () => {
      if (document.visibilityState === "visible")
        setTimeout(() => onTrigger("visible"), 100);
    };
    // Safari can restore a page already in the stuck-offset state (session
    // restore / bfcache) with no viewport event until the user interacts.
    const onPageShow = () => setTimeout(() => onTrigger("pageshow"), 100);

    logChatDebug("viewport.mount", { ios: isIos, ...geometry() });
    requestAnimationFrame(realignStuckViewport);
    window.visualViewport?.addEventListener("resize", onVvResize);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);

    // Content shrink (reasoning box collapse) has no viewport event; observe it.
    let prevHeight = 0;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      if (h < prevHeight - 4) onTrigger("content-shrink");
      prevHeight = h;
    });
    const scroller = document.querySelector<HTMLElement>(
      ".aui-thread-viewport",
    );
    if (scroller?.firstElementChild) ro.observe(scroller.firstElementChild);

    return () => {
      window.visualViewport?.removeEventListener("resize", onVvResize);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      ro.disconnect();
    };
  }, []);

  return null;
}
