"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "uno-coi-escape-reload";

// Inverse of CrossOriginIsolationGuard. The auth/consent routes are EXCLUDED
// from the app-wide COEP isolation because the Cloudflare Turnstile
// script+iframe cannot load under require-corp - but a soft SPA nav into them
// KEEPS the previous page's isolated document, so Turnstile silently fails to
// render. Reload once: the fresh document fetch hits the excluded route and
// comes back non-isolated.
export function IsolationEscapeGuard() {
  useEffect(() => {
    if (!window.crossOriginIsolated) {
      sessionStorage.removeItem(RELOAD_FLAG);
      return;
    }
    if (!sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
      return;
    }
    console.warn(
      "[coi] auth document still cross-origin isolated after reload; Turnstile may not render",
    );
  }, []);

  return null;
}
