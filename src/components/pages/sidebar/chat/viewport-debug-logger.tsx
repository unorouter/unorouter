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

    const onTrigger = (reason: string) => {
      const g = geometry();
      logChatDebug("viewport.change", { reason, ios: isIos, ...g });
      if (isIos) requestAnimationFrame(nudge);
    };

    const onVvResize = () => onTrigger("vv-resize");
    const onFocusOut = () => setTimeout(() => onTrigger("focusout"), 100);
    const onVisibility = () => {
      if (document.visibilityState === "visible")
        setTimeout(() => onTrigger("visible"), 100);
    };

    logChatDebug("viewport.mount", { ios: isIos, ...geometry() });
    window.visualViewport?.addEventListener("resize", onVvResize);
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
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
    };
  }, []);

  return null;
}
