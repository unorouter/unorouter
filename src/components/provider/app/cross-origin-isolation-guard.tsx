"use client";

import { useEffect } from "react";

// SQLocal needs SharedArrayBuffer, hence cross-origin isolation, which is a property of the LOADED
// document: a soft-nav from a non-isolated page into /chat carries the old context (SAB absent,
// SQLocal falls back to in-memory), so force one reload to re-fetch with the isolation headers.
// COEP credentialless would avoid this but Safari/iOS doesn't support it, so require-corp + reload.
const RELOAD_FLAG = "uno-coi-reload";

export function CrossOriginIsolationGuard(props: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (window.crossOriginIsolated) {
      sessionStorage.removeItem(RELOAD_FLAG);
      return;
    }
    if (!sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
      return;
    }
    // Still not isolated after a reload: don't loop. SQLocal falls back to in-memory; log for debugging.
    console.warn(
      "[coi] document not cross-origin isolated after reload; SQLocal will use in-memory storage",
    );
  }, []);

  return <>{props.children}</>;
}
