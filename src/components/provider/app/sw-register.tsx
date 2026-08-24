"use client";

import { logger } from "@/lib/utils/logger";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

export function SwRegister() {
  const t = useTranslations();
  const updateText = t("COMMON.UPDATE_AVAILABLE");
  const reloadText = t("COMMON.UPDATE_RELOAD");
  useEffect(() => {
    // Mounting proves this build's chunks loaded, so release error-fallback's one-shot guard
    // and let a future post-deploy chunk error auto-recover again.
    sessionStorage.removeItem("chunk-reload-once");
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

    // skipWaiting + clientsClaim let a new worker activate and wipe the build-scoped caches
    // while this page keeps running the PREVIOUS build's JavaScript, with no error to trigger
    // the ChunkLoadError recovery.
    let stale = false;
    const onControllerChange = () => {
      // The first worker on this origin also lands here, and nothing is stale then.
      if (!navigator.serviceWorker.controller) return;
      stale = true;
      // An unprompted reload can discard a reply mid-stream, so a visible tab is offered the
      // reload instead. Backgrounded tabs adopt silently on return.
      if (document.visibilityState !== "visible") return;
      // Stable id: every deploy claims the tab again, so a long-lived tab would otherwise
      // collect one non-expiring toast per deploy.
      toast(updateText, {
        id: "sw-update",
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

    // Registration checks for a new worker only at mount, and iOS Safari keeps tabs alive for
    // days, so a tab opened before a deploy would serve that build's HTML indefinitely and
    // then fail on chunks the deploy replaced.
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
