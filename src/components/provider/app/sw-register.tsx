"use client";

import { logger } from "@/lib/utils/logger";
import { useEffect } from "react";

// Registers the Serwist service worker served by the Turbopack route at
// /serwist/sw.js. Registering from the COEP-isolated chat doc is fine (the
// script is same-origin). Production only; the SW route only emits a real
// worker on a production build.
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // scope "/" is allowed via the route's Service-Worker-Allowed header.
    navigator.serviceWorker
      .register("/serwist/sw.js", { scope: "/" })
      .catch((err) => {
        logger.warn("Service worker registration failed", {
          context: "pwa.sw-register",
          error: String(err),
        });
      });
  }, []);

  return null;
}
