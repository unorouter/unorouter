"use client";

import { logger } from "@/lib/utils/logger";
import { useEffect } from "react";

// Registers the Serwist SW at /sw-worker/sw.js. Prod only; registering from
// the COEP-isolated chat doc is fine (same-origin script).
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // scope "/" allowed via Service-Worker-Allowed. updateViaCache "none":
    // Cloudflare rewrites our no-cache to a 4h browser TTL; explicit bypass
    // keeps update checks fresh every navigation.
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
