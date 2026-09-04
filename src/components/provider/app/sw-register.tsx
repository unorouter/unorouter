"use client";

import { logger } from "@/lib/utils/logger";
import { chatRunningAtom, chatStore, dirtyFormsAtom } from "@/store/chat-store";
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

    // An installing worker asks every open page whether it has finished
    // loading and holds its install until they all have (see sw.ts). It
    // replies on the port it was handed, so this works for a worker that
    // does not control this page yet.
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== "READY_STATE") return;
      e.ports[0]?.postMessage(document.readyState);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    let registration: ServiceWorkerRegistration | undefined;
    const register = () => {
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
    };
    // Registering during hydration let an update install while this very
    // page was still loading; after `load` the gate above has nothing to wait
    // for on this page.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

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
        // A reload mid-reply loses the half-written answer, and an editor
        // with unsaved fields loses them; the composer draft is on the
        // conversation row and survives.
        if (
          chatStore.get(chatRunningAtom) ||
          chatStore.get(dirtyFormsAtom) > 0
        ) {
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
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("message", onMessage);
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
