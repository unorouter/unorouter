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

    // iOS nudges the page scale above 1 on its own (input auto-zoom, double
    // tap) and then leaves it stuck slightly zoomed with the shell offset -
    // diagnostics show innerHeight parked at 578/592 on a 660 screen with the
    // keyboard closed. Cap maximum-scale at 1 on iOS only: Safari suppresses
    // the automatic zooms but still honors a deliberate pinch (it ignores the
    // cap for user gestures), and Android keeps full zoom for accessibility.
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const prevViewportContent = viewportMeta?.getAttribute("content") ?? null;
    if (viewportMeta && prevViewportContent) {
      viewportMeta.setAttribute(
        "content",
        prevViewportContent.includes("maximum-scale")
          ? prevViewportContent.replace(
              /maximum-scale=[\d.]+/,
              "maximum-scale=1",
            )
          : `${prevViewportContent}, maximum-scale=1`,
      );
    }

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
    // chat on send). But svh is the keyboard-HIDDEN height, so with the keyboard
    // up the 660px shell overflows the 376px visible area and Safari offsets the
    // visual viewport (offsetTop 284) to reveal the composer - and with a
    // non-zero offsetTop Safari's hit-testing desyncs the caret from where
    // typing lands. Neither svh NOR dvh fixes this: this device already sends
    // `interactive-widget=resizes-content` yet the layout viewport does not
    // shrink for the keyboard. Mirror the live visual-viewport height into
    // `--vvh` ONLY while the composer is focused (keyboard genuinely up); the
    // thread root caps to it, the shell fits the visible area, and Safari never
    // needs the offset. Cleared the moment focus leaves: an unconditional
    // mirror once squished the shell into the top half of the screen when iOS
    // left vvH stale after a dismiss. Do NOT "simplify" to dvh.
    const syncViewportHeight = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      if (composerFocused()) {
        document.documentElement.style.setProperty(
          "--vvh",
          `${Math.round(vv.height)}px`,
        );
        // Once the shell is capped to the visible height the offset Safari
        // applied to reveal the composer serves no purpose, but Safari never
        // removes it on its own (WebKit 297779) - and a non-zero offsetTop is
        // exactly what desyncs caret hit-testing. Send it back to 0 after the
        // cap has laid out; the composer is inside the visible area by then,
        // so Safari has no reason to re-offset (Lumiverse ships this same
        // counteract on visualViewport scroll). Self-terminating: the scroll
        // re-fires this handler with offsetTop 0.
        requestAnimationFrame(() => {
          const live = window.visualViewport;
          if (!live || live.scale > 1.01 || !composerFocused()) return;
          if (live.offsetTop > 0) window.scrollTo(0, 0);
        });
      } else {
        document.documentElement.style.removeProperty("--vvh");
      }
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
      // iOS that desyncs the textarea caret hit-testing WHILE typing, so the
      // caret renders on the wrong line and typing lands at the true end. That
      // is not limited to keyboard-driven vv-resizes: content-shrink fires when
      // a reasoning box collapses after a stream, which happens mid-typing
      // whenever the user composes the next message while a response streams.
      // Skip the nudge for ANY trigger while the composer is focused; the
      // blackout it guards against needs a repaint the next unfocused trigger
      // (focusout at the latest) still delivers, and svh sizing is the primary
      // blackout fix anyway.
      if (isIos && !composerFocused()) {
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
      if (viewportMeta && prevViewportContent) {
        viewportMeta.setAttribute("content", prevViewportContent);
      }
    };
  }, []);

  return null;
}
