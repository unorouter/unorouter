"use client";

import { useSyncExternalStore } from "react";

type MediaQuery = string | number;

/**
 * Subscribe to a CSS media query without cascading renders. Returns false
 * during SSR and on first paint so the server-rendered HTML matches.
 */
export function useMediaQuery(query: MediaQuery): boolean {
  const q = String(query);
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(q);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(q).matches,
    () => false,
  );
}
