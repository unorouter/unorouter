"use client";

import { useEffect } from "react";

export function ScrollHashSync() {
  useEffect(() => {
    const root = document.querySelector("main") ?? document;
    const headings = Array.from(
      root.querySelectorAll<HTMLHeadingElement>("h2[id]"),
    ).filter(
      // The search dialog's visually-hidden DialogTitle h2 carries a Base UI useId
      // (base-ui-_R_...) and must never drive the hash.
      (h) => !h.id.startsWith("base-ui") && !h.closest(".sr-only"),
    );
    if (headings.length === 0) return;

    // Every real anchor lives inside <main>, so a hash resolving nowhere there is stale
    // (a useId a prior build wrote) and safe to clear.
    const current = decodeURIComponent(window.location.hash.slice(1));
    const isRealTarget =
      !current.startsWith("base-ui") &&
      root instanceof Element &&
      root.querySelector(`[id="${CSS.escape(current)}"]`) != null;
    if (current && !isRealTarget) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }

    const bare = () => window.location.pathname + window.location.search;
    // Headings sit below the sticky header, so "reached" means crossing that
    // line rather than the viewport edge.
    const TRIGGER_LINE = 96;

    function apply() {
      let currentId: string | null = null;
      for (const h of headings) {
        if (h.getBoundingClientRect().top <= TRIGGER_LINE) currentId = h.id;
        else break;
      }

      if (!currentId) {
        if (window.location.hash) window.history.replaceState(null, "", bare());
        return;
      }
      if (`#${currentId}` !== window.location.hash) {
        window.history.replaceState(null, "", `#${currentId}`);
      }
    }

    // <main> is the scroll container (the shell caps it at max-h-dvh), so the window
    // scroll event never fires there; listen on both so either layout works.
    const scroller = document.querySelector("main");
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        apply();
      });
    };

    // No initial apply(): a deep link has not been scrolled to yet, so it would clear the
    // anchor the visitor arrived on.
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      scroller?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
