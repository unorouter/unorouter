"use client";

import { useEffect } from "react";

// Mirrors the section scrolled into view into the URL hash (history.replaceState,
// no navigation/scroll jump) so the address bar always points at the visible
// section and can be copied/shared. Observes the DocSection h2[id] headings.
export function ScrollHashSync() {
  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll<HTMLHeadingElement>("h2[id]"),
    );
    if (headings.length === 0) return;

    const visible = new Set<string>();

    function apply() {
      let topId: string | null = null;
      let topOffset = Number.MAX_VALUE;
      for (const h of headings) {
        if (!visible.has(h.id)) continue;
        const top = h.getBoundingClientRect().top;
        if (top < topOffset) {
          topOffset = top;
          topId = h.id;
        }
      }
      if (topId && `#${topId}` !== window.location.hash) {
        window.history.replaceState(null, "", `#${topId}`);
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        apply();
      },
      // Trigger band near the top of the viewport so the "current" section is
      // the one the reader is actually on, not one still far below the fold.
      { rootMargin: "0px 0px -80% 0px", threshold: 0 },
    );

    for (const h of headings) observer.observe(h);
    return () => observer.disconnect();
  }, []);

  return null;
}
