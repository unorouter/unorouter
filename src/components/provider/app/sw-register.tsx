"use client";

import { logger } from "@/lib/utils/logger";
import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    // We mounted, so this build's chunks loaded fine; clear the one-shot chunk-reload guard so a
    // future post-deploy chunk error can auto-recover again (set in error-fallback).
    sessionStorage.removeItem("chunk-reload-once");

    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

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
