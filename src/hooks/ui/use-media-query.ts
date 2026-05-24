"use client";

import { useSyncExternalStore } from "react";

type MediaQuery = string | number;

/** CSS media query; false during SSR/first paint. */
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
