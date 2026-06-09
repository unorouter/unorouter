"use client";

import { logger } from "@/lib/utils/logger";
import { useEffect } from "react";

// Registers the Serwist service worker served by the Turbopack route at
// /sw-worker/sw.js. Registering from the COEP-isolated chat doc is fine (the
// script is same-origin). Production only; the SW route only emits a real
// worker on a production build.
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // scope "/" is allowed via the route's Service-Worker-Allowed header.
    // updateViaCache "none": Cloudflare rewrites our no-cache on /sw-worker/*
    // to max-age=14400 (4h browser TTL); explicit bypass keeps update checks
    // fresh on every navigation (iOS Safari included).
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
