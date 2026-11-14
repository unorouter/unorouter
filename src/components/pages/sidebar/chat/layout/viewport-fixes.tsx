"use client";

import { useEffect } from "react";

export function ViewportFixes() {
  useEffect(() => {
    if (!/iP(hone|ad|od)/.test(navigator.userAgent)) return;

    // Set ONCE, never restored: toggling this meta made Safari re-evaluate the
    // viewport mid-session.
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const metaContent = viewportMeta?.getAttribute("content");
    if (viewportMeta && metaContent) {
      const wanted = metaContent.includes("maximum-scale")
        ? metaContent.replace(/maximum-scale=[\d.]+/, "maximum-scale=1")
        : `${metaContent}, maximum-scale=1`;
      if (wanted !== metaContent) viewportMeta.setAttribute("content", wanted);
    }

    const getScroller = () =>
      document.querySelector<HTMLElement>(".aui-thread-viewport");

    // Transform-free: a transform toggle desyncs Safari's caret hit-testing
    // while the composer is focused.
    const repaintScroll = () => {
      const scroller = getScroller();
      if (!scroller) return;
      const top = scroller.scrollTop;
      scroller.scrollTop = top + 1;
      scroller.scrollTop = top;
    };

    const nudge = () => {
      const scroller = getScroller();
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
    // dismiss or pinch-zoom-out (WebKit 297779, partially fixed in 26.1).
    const realignStuckViewport = () => {
      const vv = window.visualViewport;
      if (!vv || vv.scale > 1.01) return;
      if (window.scrollY > 0) window.scrollTo(0, 0);
      if (vv.offsetTop <= 0) return;
      window.scrollBy(0, -1);
      window.scrollBy(0, 1);
    };

    // After the iOS keyboard closes the sticky footer can stay where the
    // keyboard left it, with nothing painted below: the nudges above do not
    // clear it (CriOS 153, iOS 26.7), only a real relayout of the scroller.
    let unstickTimer: ReturnType<typeof setTimeout> | null = null;
    const unstickFooter = () => {
      if (composerFocused()) return;
      const vv = window.visualViewport;
      const footer = document.querySelector<HTMLElement>(
        ".aui-thread-viewport-footer",
      );
      const scroller = getScroller();
      if (!vv || !footer || !scroller) return;
      const gap =
        vv.offsetTop + vv.height - footer.getBoundingClientRect().bottom;
      if (gap < 40) return;
      const top = scroller.scrollTop;
      scroller.style.display = "none";
      void scroller.offsetHeight;
      scroller.style.display = "";
      scroller.scrollTop = top;
    };

    const onTrigger = () => {
      requestAnimationFrame(composerFocused() ? repaintScroll : nudge);
      // While focused, offsetTop > 0 is Safari's own reveal pan: touching it
      // mid-typing desyncs the caret.
      if (!composerFocused()) requestAnimationFrame(realignStuckViewport);
      if (unstickTimer) clearTimeout(unstickTimer);
      unstickTimer = setTimeout(unstickFooter, 600);
    };
    const onDelayed = () => setTimeout(onTrigger, 100);
    const onVisibility = () => {
      if (document.visibilityState === "visible") onDelayed();
    };

    requestAnimationFrame(realignStuckViewport);
    window.visualViewport?.addEventListener("resize", onTrigger);
    document.addEventListener("focusout", onDelayed);
    document.addEventListener("visibilitychange", onVisibility);
    // bfcache restore can land in the stuck-offset state with no viewport event.
    window.addEventListener("pageshow", onDelayed);

    let prevHeight = 0;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      if (h < prevHeight - 4) onTrigger();
      prevHeight = h;
    });
    const content = getScroller()?.firstElementChild;
    if (content) ro.observe(content);

    return () => {
      window.visualViewport?.removeEventListener("resize", onTrigger);
      document.removeEventListener("focusout", onDelayed);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onDelayed);
      ro.disconnect();
      if (unstickTimer) clearTimeout(unstickTimer);
    };
  }, []);

  return null;
}
