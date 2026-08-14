"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// False during SSR AND the hydration render, true right after. Lets shell
// components branch on client-only state (auth, cookies) without mismatching
// the server-rendered HTML.
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
