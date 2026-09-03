"use client";

import { logger } from "@/lib/utils/logger";
import { chatRunningAtom, chatStore } from "@/store/chat-store";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

export function SwRegister() {
  const t = useTranslations();
  const updateText = t("COMMON.UPDATE_AVAILABLE");
  const reloadText = t("COMMON.UPDATE_RELOAD");

  useEffect(() => {
    // Mounting proves this build's chunks loaded, so release error-fallback's one-shot guard.
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

    // skipWaiting + clientsClaim wipe the build-scoped caches while this page keeps running
    // the PREVIOUS build's JavaScript, with no error to trigger ChunkLoadError recovery.
    let stale = false;
    const onControllerChange = () => {
      if (!navigator.serviceWorker.controller) return;
      stale = true;
      if (document.visibilityState !== "visible") return;
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

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (stale) {
        // A reload mid-reply loses the half-written answer; the composer
        // draft is on the conversation row and survives, this is not.
        if (chatStore.get(chatRunningAtom)) {
          toast(updateText, {
            id: "sw-update",
            duration: Infinity,
            action: {
              label: reloadText,
              onClick: () => window.location.reload(),
            },
          });
          return;
        }
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
