"use client";

import { useEffect } from "react";

export function ScrollHashSync() {
  useEffect(() => {
    const root = document.querySelector("main") ?? document;
    const headings = Array.from(
      root.querySelectorAll<HTMLHeadingElement>("h2[id]"),
    ).filter(
      // Base UI useIds (base-ui-_R_...) are generated, never real anchors.
      (h) => !h.id.startsWith("base-ui") && !h.closest(".sr-only"),
    );
    if (headings.length === 0) return;

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

    // No initial apply(): it would clear the deep-link anchor before the scroll to it.
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      scroller?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}
