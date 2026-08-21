"use client";

import { logger } from "@/lib/utils/logger";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

export function SwRegister() {
  const t = useTranslations();
  // Resolved here rather than inside the effect so the effect can stay
  // mount-only: re-registering the worker on a locale change would be wrong,
  // and these two strings are all it needs from the translator.
  const updateText = t("COMMON.UPDATE_AVAILABLE");
  const reloadText = t("COMMON.UPDATE_RELOAD");
  useEffect(() => {
    // We mounted, so this build's chunks loaded fine; clear the one-shot chunk-reload guard so a
    // future post-deploy chunk error can auto-recover again (set in error-fallback).
    sessionStorage.removeItem("chunk-reload-once");
    // Left by an older resume-reload watchdog; clear it so the key does not
    // linger in sessionStorage for returning users.
    sessionStorage.removeItem("sw-reload-pending");

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
      // A tab held in the foreground never reaches the visibilitychange path, so
      // it would sit on the old build until closed. Reloading it unprompted can
      // discard a reply mid-stream, so offer the reload and let the reader pick
      // the moment. Backgrounded tabs still adopt silently on return.
      if (document.visibilityState !== "visible") return;
      toast(updateText, {
        duration: Infinity,
        action: {
          label: reloadText,
          onClick: () => window.location.reload(),
        },
      });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- register once per mount; the toast strings are captured at registration and a locale change must not re-register the worker
  }, []);

  return null;
}
