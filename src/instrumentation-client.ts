import "./lib/utils/format/date";
import { IS_DEV, POSTHOG_DISABLED } from "./lib/config/constants";
import { env } from "./lib/config/env";
import { registerPostHog } from "./lib/posthog-lazy";

if (!IS_DEV && !POSTHOG_DISABLED && env.posthogHost) {
  // Dynamic so posthog-js stays out of the shared bundle when disabled.
  void import("posthog-js").then((m) => {
    m.default.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: env.posthogHost,
      ui_host: "https://eu.posthog.com",
      defaults: "2026-01-30",
      capture_performance: true,
      capture_heatmaps: true,
      capture_dead_clicks: true,
    });
    registerPostHog(m.default);
  });
}

// A deploy purges the previous build's hashed chunks; an already-open tab
// then fails dynamic imports on click (menus/drawers silently dead). Reload
// once to pick up the new build; the SW chunk cache covers the common case.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = String(event.reason ?? "");
    if (!msg.includes("ChunkLoadError") && !/Failed to load chunk/.test(msg))
      return;
    // Timestamped guard: at most one auto-reload per 30s so a genuinely
    // broken asset cannot reload-loop the tab.
    const last = Number(sessionStorage.getItem("chunk-reload") ?? 0);
    if (Date.now() - last < 30_000) return;
    sessionStorage.setItem("chunk-reload", String(Date.now()));
    window.location.reload();
  });
}
