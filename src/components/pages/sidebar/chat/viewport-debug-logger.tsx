"use client";

import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { useEffect } from "react";

// iOS 26 Safari leaves a stale/blank composited layer when the visual viewport
// changes (keyboard show/hide, URL-bar animation) or when the chat content
// shrinks (a reasoning box collapsing after a stream finishes) - the UI goes
// black until a manual scroll forces a repaint. The primary fix is the svh
// height units (see sidebar.tsx). This component is the belt-and-suspenders
// layer: it (a) nudges WebKit to recomposite on the exact triggers, and (b)
// logs viewport/scroller geometry into the exportable chat-debug log so a user
// who still hits the bug can send a diagnostics export that shows precisely
// what the viewport did. No-op off iOS.
export function ViewportDebugLogger() {
  useEffect(() => {
    const ua = navigator.userAgent;
    const isIos = /iP(hone|ad|od)/.test(ua);
    // Everything below (recomposite nudge, --vvh mirror, geometry logging) is
    // iOS-only. Off iOS the ResizeObserver still fired per content-shrink (every
    // reasoning-box collapse / streaming reflow), each firing a synchronous
    // full-buffer localStorage write in logChatDebug - a main-thread storm that
    // froze desktop chat. Bail before wiring anything when not on iOS.
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

    const nudge = () => {
      const scroller = document.querySelector<HTMLElement>(
        ".aui-thread-viewport",
      );
      if (!scroller) return;
      const top = scroller.scrollTop;
      scroller.scrollTop = top + 1;
      scroller.scrollTop = top;
      scroller.style.transform = "translateZ(0)";
      requestAnimationFrame(() => {
        scroller.style.transform = "";
      });
    };

    // The chat shell is sized with `svh` (the blanking fix in sidebar.tsx: a
    // dynamic dvh height relayouts on every URL-bar/keyboard move and blanked the
    // chat on send). But svh is the keyboard-HIDDEN height, so when the keyboard
    // opens the composer - pinned to the bottom of the full-height shell - drops
    // below the visible area ("frame too low"; diagnostics show innerH:660
    // vvH:376 offset:0, scroller still 612 tall). Neither svh NOR dvh fixes this
    // here: this device already sends `interactive-widget=resizes-content` yet
    // the layout viewport doesn't shrink for the keyboard, so dvh stays 660 too.
    // The visualViewport listener is the documented fallback for exactly that.
    // Mirror the live visual-viewport height into `--vvh`; the thread root caps
    // to it so the composer tracks the visible area. Do NOT "simplify" to dvh -
    // it won't shrink for the keyboard on iOS and would reintroduce the bug.
    // Cleared off iOS so the CSS falls back to 100%.
    const syncViewportHeight = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      document.documentElement.style.setProperty(
        "--vvh",
        `${Math.round(vv.height)}px`,
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

    const composerFocused = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLElement &&
        (el.tagName === "TEXTAREA" ||
          el.tagName === "INPUT" ||
          el.isContentEditable)
      );
    };

    const onTrigger = (reason: string) => {
      const g = geometry();
      logChatDebug("viewport.change", { reason, ios: isIos, ...g });
      // The recompositing nudge toggles a transform on the scroll ancestor. On
      // iOS that desyncs the textarea caret hit-testing WHILE typing (each
      // keystroke fires a vv-resize as the keyboard/accessory bar animates), so
      // the caret renders on the wrong line and typing lands at the true end.
      // Skip the nudge for keyboard-driven vv-resizes while the composer is
      // focused; still nudge on the blackout triggers (visibility/content-shrink)
      // which never fire mid-typing.
      if (isIos && !(reason === "vv-resize" && composerFocused())) {
        requestAnimationFrame(nudge);
      }
      // Realign the stuck viewport (shell too low after a keyboard dismiss or
      // zoom-out). NOT while the composer is focused: with the keyboard up an
      // offsetTop > 0 is the correct state, and jiggling would fight typing.
      // focusout / zoom-settle are the real dismiss signals.
      if (!composerFocused()) {
        requestAnimationFrame(realignStuckViewport);
      }
      // Keep the shell height matched to the visible viewport on every change
      // (keyboard open/close, zoom, URL-bar). Safe mid-typing: it only resizes
      // the container, never scrolls or steals focus.
      if (isIos) syncViewportHeight();
    };

    const onVvResize = () => onTrigger("vv-resize");
    const onFocusOut = () => setTimeout(() => onTrigger("focusout"), 100);
    const onVisibility = () => {
      if (document.visibilityState === "visible")
        setTimeout(() => onTrigger("visible"), 100);
    };

    logChatDebug("viewport.mount", { ios: isIos, ...geometry() });
    if (isIos) syncViewportHeight();
    const onVvScroll = () => {
      if (isIos) syncViewportHeight();
    };
    window.visualViewport?.addEventListener("resize", onVvResize);
    window.visualViewport?.addEventListener("scroll", onVvScroll);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("visibilitychange", onVisibility);

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
      window.visualViewport?.removeEventListener("scroll", onVvScroll);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      document.documentElement.style.removeProperty("--vvh");
    };
  }, []);

  return null;
}
