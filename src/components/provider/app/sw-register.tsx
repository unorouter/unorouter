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
    // controllerchange fires when the new worker takes control, but its activate
    // handler deletes the build-scoped caches inside waitUntil, which settles
    // later. Reloading into that window fetches HTML whose chunks were just
    // evicted and not yet refetched, so the page renders blank and a second
    // refresh is needed. Wait for the worker to leave "activating" first.
    const whenActivated = () => {
      const w = navigator.serviceWorker.controller;
      if (!w || w.state === "activated") return Promise.resolve();
      return new Promise<void>((resolve) => {
        // iOS Safari can hold a worker in "activating" indefinitely, and never
        // reloading is worse than reloading early, so the wait is capped.
        const timer = setTimeout(finish, 3000);
        function finish() {
          clearTimeout(timer);
          w!.removeEventListener("statechange", onState);
          resolve();
        }
        function onState() {
          if (w!.state === "activated") finish();
        }
        w.addEventListener("statechange", onState);
      });
    };
    // A second reload while the first is in flight lands mid-navigation, which
    // is the state iOS turns into a permanently blank page.
    let refreshing = false;
    const reloadWhenReady = () => {
      if (refreshing) return;
      refreshing = true;
      void whenActivated().then(() => window.location.reload());
    };

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
          onClick: () => reloadWhenReady(),
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
        reloadWhenReady();
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
