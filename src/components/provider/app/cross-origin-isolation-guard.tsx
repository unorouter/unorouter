"use client";

import { useEffect } from "react";

// SQLocal's OPFS VFS needs SharedArrayBuffer, which only exists in a
// cross-origin-isolated document (COOP same-origin + COEP require-corp). Those
// headers are scoped to /chat + /playground, but cross-origin isolation is a
// property of the LOADED DOCUMENT, not the URL: a client-side soft navigation
// from a non-isolated page (home, models, pricing) into /chat carries the old
// non-isolated context, so SAB is absent and SQLocal silently falls back to an
// in-memory DB ("DB disappears"). A hard load of /chat gets the headers and is
// isolated. So when we arrive non-isolated, force one reload to re-fetch the
// document with the isolation headers.
//
// credentialless COEP would skip this, but Safari/iOS does not support it, so
// require-corp + this reload is the only path that also works on iOS.
//
// Side-effect only (renders children unchanged) so SSR and the first client
// render match - no hydration mismatch. The reload fires before SQLocal's own
// open (which runs in a child effect/query) can persist anything, and any
// in-memory connection opened in the doomed render is discarded by the reload.
const RELOAD_FLAG = "uno-coi-reload";

export function CrossOriginIsolationGuard(props: { children: React.ReactNode }) {
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
    // Still not isolated after a reload: headers genuinely missing or a
    // subresource broke isolation. Don't loop - SQLocal falls back to in-memory
    // so the app still works; surface it for debugging.
    console.warn(
      "[coi] document not cross-origin isolated after reload; SQLocal will use in-memory storage",
    );
  }, []);

  return <>{props.children}</>;
}
