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

    let registration: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker
      .register("/sw-worker/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
      })
      .catch((err) => {
        logger.warn("Service worker registration failed", {
          context: "pwa.sw-register",
          error: String(err),
        });
      });

    // Registration only checks for a new worker at mount. iOS Safari keeps a tab alive for
    // days, so a tab opened before a deploy would serve that build's HTML indefinitely and
    // then fail on chunks the deploy replaced. Re-check whenever the tab comes back.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      registration?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}
