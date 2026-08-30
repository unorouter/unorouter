"use client";

import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { useEffect } from "react";

export function ViewportDebugLogger() {
  useEffect(() => {
    const isIos = /iP(hone|ad|od)/.test(navigator.userAgent);
    // Off iOS the ResizeObserver fires per content-shrink, each a synchronous
    // full-buffer localStorage write in logChatDebug: it froze desktop chat.
    if (!isIos) return;

    // Set ONCE, never restored: toggling this meta made Safari re-evaluate the
    // viewport mid-session.
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const metaContent = viewportMeta?.getAttribute("content");
    if (
      viewportMeta &&
      metaContent &&
      !/maximum-scale=1(?![\d.])/.test(metaContent)
    ) {
      viewportMeta.setAttribute(
        "content",
        metaContent.includes("maximum-scale")
          ? metaContent.replace(/maximum-scale=[\d.]+/, "maximum-scale=1")
          : `${metaContent}, maximum-scale=1`,
      );
    }

    const geometry = () => {
      const scroller = document.querySelector<HTMLElement>(
        ".aui-thread-viewport",
      );
      const footer = document.querySelector<HTMLElement>(
        ".aui-thread-viewport-footer",
      );
      const shell = document.querySelector<HTMLElement>(
        '[data-slot="sidebar-wrapper"]',
      );
      const vv = window.visualViewport;
      // Negative = the send button is cut off by that many px.
      const footerGap =
        vv && footer
          ? Math.round(
              vv.offsetTop + vv.height - footer.getBoundingClientRect().bottom,
            )
          : null;
      const active = document.activeElement;
      return {
        innerH: window.innerHeight,
        innerW: window.innerWidth,
        shellTop: shell ? Math.round(shell.getBoundingClientRect().top) : null,
        scrollerTop: scroller
          ? Math.round(scroller.getBoundingClientRect().top)
          : null,
        footerBottom: footer
          ? Math.round(footer.getBoundingClientRect().bottom)
          : null,
        vvH: vv ? Math.round(vv.height) : null,
        vvScale: vv ? Math.round(vv.scale * 100) / 100 : null,
        vvOffsetTop: vv ? Math.round(vv.offsetTop) : null,
        scrollY: Math.round(window.scrollY),
        shellH: shell?.clientHeight ?? null,
        scrollerH: scroller?.clientHeight ?? null,
        scrollerScrollH: scroller?.scrollHeight ?? null,
        footerGap,
        activeEl:
          active instanceof HTMLElement
            ? `${active.tagName.toLowerCase()}${active.className.includes("aui-composer-input") ? ":composer" : active.className.includes("aui-edit-composer-input") ? ":edit" : ""}`
            : null,
        docHidden: document.hidden,
        mismatch: !!vv && !!scroller && scroller.clientHeight > vv.height + 4,
      };
    };

    // Transform-free: a transform toggle desyncs Safari's caret hit-testing
    // while the composer is focused.
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
    // dismiss or pinch-zoom-out (WebKit 297779, partially fixed in 26.1).
    const realignStuckViewport = () => {
      const vv = window.visualViewport;
      if (!vv || vv.scale > 1.01) return;
      if (window.scrollY > 0) window.scrollTo(0, 0);
      if (vv.offsetTop <= 0) return;
      window.scrollBy(0, -1);
      window.scrollBy(0, 1);
    };

    let lastIntruderScan = 0;
    const scanIntruders = (g: ReturnType<typeof geometry>) => {
      if (g.footerGap == null || g.footerGap >= -4) return;
      const now = Date.now();
      if (now - lastIntruderScan < 10_000) return;
      lastIntruderScan = now;
      const shell = document.querySelector('[data-slot="sidebar-wrapper"]');
      const flow: Record<string, unknown>[] = [];
      for (const el of document.body.children) {
        if (el === shell) continue;
        const cs = getComputedStyle(el);
        if (cs.position === "fixed" || cs.position === "absolute") continue;
        const r = el.getBoundingClientRect();
        if (r.height < 1) continue;
        flow.push({
          tag: el.tagName,
          id: el.id || undefined,
          cls: String(el.className).slice(0, 80),
          h: Math.round(r.height),
          top: Math.round(r.top),
        });
      }
      logChatDebug("viewport.intruders", {
        wrapperTop: shell
          ? Math.round(shell.getBoundingClientRect().top)
          : null,
        bodyScrollH: document.body.scrollHeight,
        htmlScrollH: document.documentElement.scrollHeight,
        flow,
      });
    };

    const onTrigger = (reason: string) => {
      const g = geometry();
      logChatDebug("viewport.change", { reason, ...g });
      scanIntruders(g);
      requestAnimationFrame(composerFocused() ? repaintScroll : nudge);
      // While focused, offsetTop > 0 is Safari's own reveal pan: touching it
      // mid-typing desyncs the caret.
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
    // bfcache restore can land in the stuck-offset state with no viewport event.
    const onPageShow = () => setTimeout(() => onTrigger("pageshow"), 100);

    logChatDebug("viewport.mount", {
      layout: "dvh-sticky",
      viewportMeta:
        document
          .querySelector('meta[name="viewport"]')
          ?.getAttribute("content") ?? null,
      ...geometry(),
    });
    requestAnimationFrame(realignStuckViewport);
    window.visualViewport?.addEventListener("resize", onVvResize);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);

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
