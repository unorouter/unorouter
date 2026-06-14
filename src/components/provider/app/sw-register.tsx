"use client";

import { logger } from "@/lib/utils/logger";
import { useEffect } from "react";

    // Registers the Serwist SW at /sw-worker/sw.js. Prod only; fine from the COEP-isolated chat doc (same-origin script).
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

        // scope "/" via Service-Worker-Allowed. updateViaCache none: CF rewrites no-cache to a 4h TTL, bypass keeps update checks fresh.
    navigator.serviceWorker
      .register("/sw-worker/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => {
        logger.warn("Service worker registration failed", {
          context: "pwa.sw-register",
          error: String(err),
        });
      });
  }, []);

  return null;
}
