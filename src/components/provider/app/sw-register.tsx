"use client";

import { logChatDebug } from "@/lib/utils/chat-debug-log";
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
      if (e.data?.type === "INSTALL_GATE") {
        logChatDebug("sw.install_gate", {
          waitedMs: e.data.waitedMs,
          clients: e.data.clients,
        });
        return;
      }
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
          logChatDebug("sw.registered", {
            controlled: !!navigator.serviceWorker.controller,
            waiting: !!reg.waiting,
            installing: !!reg.installing,
          });
          if (reg.waiting) onUpdateReady();
          watchInstalling(reg);
          reg.addEventListener("updatefound", () => {
            logChatDebug("sw.updatefound", {
              visible: document.visibilityState === "visible",
            });
            watchInstalling(reg);
          });
        })
        .catch((err) => {
          logChatDebug("sw.register_failed", {
            error: String(err).slice(0, 200),
          });
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

    // A new worker installs and then WAITS (skipWaiting/clientsClaim are off
    // in sw.ts). This page applies it with SKIP_WAITING on its next return to
    // the foreground while nothing is mid-flight, or from the toast; the
    // reload follows activation. Nothing is pulled out from under a page
    // that is busy, hidden, or still booting.
    let stale = false;
    const busy = () =>
      chatStore.get(chatRunningAtom) || chatStore.get(dirtyFormsAtom) > 0;
    const offer = (apply: () => void) =>
      toast(updateText, {
        id: "sw-update",
        duration: Infinity,
        action: { label: reloadText, onClick: apply },
      });
    const applyWaiting = (reason: string) => {
      const worker = registration?.waiting;
      if (!worker) {
        // Activated elsewhere already; the reload alone picks it up.
        logChatDebug("sw.reload", { reason });
        window.location.reload();
        return;
      }
      logChatDebug("sw.apply_update", { reason });
      worker.addEventListener("statechange", () => {
        if (worker.state !== "activated") return;
        logChatDebug("sw.reload", { reason });
        window.location.reload();
      });
      worker.postMessage({ type: "SKIP_WAITING" });
    };
    const onUpdateReady = () => {
      // Only an update: a first install has no controller and needs no reload.
      if (!navigator.serviceWorker.controller) return;
      stale = true;
      logChatDebug("sw.update_ready", {
        visible: document.visibilityState === "visible",
      });
      if (document.visibilityState === "visible")
        offer(() => applyWaiting("toast"));
    };
    const watchInstalling = (reg: ServiceWorkerRegistration) => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed") onUpdateReady();
      });
    };
    // Fallback: a controller change without our SKIP_WAITING (another tab
    // applied it, or a first install claiming nothing) is treated the same.
    const onControllerChange = () => {
      if (!navigator.serviceWorker.controller) return;
      stale = true;
      logChatDebug("sw.controllerchange", {
        visible: document.visibilityState === "visible",
      });
      if (document.visibilityState === "visible")
        offer(() => applyWaiting("toast"));
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (stale) {
        if (busy()) {
          offer(() => applyWaiting("toast"));
          return;
        }
        stale = false;
        applyWaiting("stale_on_visible");
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
