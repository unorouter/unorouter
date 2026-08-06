"use client";

import { useEffect } from "react";

// Mirrors the section scrolled into view into the URL hash (history.replaceState,
// no navigation/scroll jump) so the address bar always points at the visible
// section and can be copied/shared. Observes the DocSection h2[id] headings
// inside <main> only, so portalled dialog titles (the search command dialog's
// visually-hidden h2 carries a Base UI useId) never leak into the hash.
export function ScrollHashSync() {
  useEffect(() => {
    const root = document.querySelector("main") ?? document;
    const headings = Array.from(
      root.querySelectorAll<HTMLHeadingElement>("h2[id]"),
    ).filter(
      // The search command dialog renders a visually-hidden DialogTitle h2
      // whose id is a Base UI useId (base-ui-_R_...); it sits in the shell
      // header, not the article, and must never drive the hash.
      (h) => !h.id.startsWith("base-ui") && !h.closest(".sr-only"),
    );
    if (headings.length === 0) return;

    // Drop a stale/garbage hash (e.g. a portalled dialog's Base UI useId that a
    // prior build wrote) that points at no in-content target, so links stay
    // clean. Any real section/step anchor lives inside <main>, so a hash that
    // resolves nowhere there is safe to clear.
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

      // Above the first heading the page is the hero, not a section, so the
      // bare URL is the one worth copying.
      if (!currentId) {
        if (window.location.hash) window.history.replaceState(null, "", bare());
        return;
      }
      if (`#${currentId}` !== window.location.hash) {
        window.history.replaceState(null, "", `#${currentId}`);
      }
    }

    // <main> is the scroll container (the shell caps it at max-h-dvh), so the
    // window scroll event never fires; listen on both so either layout works.
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

    // No initial apply(): an incoming deep link has not been scrolled to yet,
    // and clearing it here would break the anchor the visitor arrived on.
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      scroller?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
