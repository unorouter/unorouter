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

    // A new worker taking over is not the same as this document USING it. skipWaiting +
    // clientsClaim let it activate and wipe the build-scoped caches while the page keeps
    // running the previous build's JavaScript, with no error to trigger the ChunkLoadError
    // recovery. Users read that as "your deploys arrive late, I have to close the tab a few
    // times", and any bug report made from that tab is really about the old build.
    let stale = false;
    const onControllerChange = () => {
      // The first worker on this origin also lands here. Nothing is stale then, so
      // reloading would only flash the page for every new visitor.
      if (!navigator.serviceWorker.controller) return;
      stale = true;
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    // Registration only checks for a new worker at mount. iOS Safari keeps a tab alive for
    // days, so a tab opened before a deploy would serve that build's HTML indefinitely and
    // then fail on chunks the deploy replaced. Re-check whenever the tab comes back, and
    // take the same moment to adopt a worker that claimed us while we were away: returning
    // to a tab is when a fresh build is wanted and nothing can be mid-reply. A tab held in
    // the foreground stays on the old build until it is closed, as it does today, which
    // beats reloading out from under someone.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (stale) {
        stale = false;
        window.location.reload();
        return;
      }
      registration?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  return null;
}
