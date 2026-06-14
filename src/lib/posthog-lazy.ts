import { IS_DEV, POSTHOG_DISABLED } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import type { PostHog } from "posthog-js";

    // Lazy proxy keeping posthog-js out of page bundles: the module loads on first call. Pre-resolve calls queue; disabled calls drop.
let instance: PostHog | null = null;
let loading = false;
const queue: Array<(p: PostHog) => void> = [];

function ensureLoaded() {
  if (instance || loading || IS_DEV || POSTHOG_DISABLED || !env.posthogHost) {
    return;
  }
  loading = true;
  void import("posthog-js").then((m) => {
    m.default.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: env.posthogHost,
      ui_host: "https://eu.posthog.com",
      defaults: "2026-01-30",
      capture_performance: true,
      capture_heatmaps: true,
      capture_dead_clicks: true,
    });
    instance = m.default;
    for (const fn of queue.splice(0)) fn(instance);
  });
}

function run(fn: (p: PostHog) => void) {
  if (instance) {
    fn(instance);
    return;
  }
  // Bound so a never-resolving load (disabled/adblock) can't grow unbounded.
  if (queue.length < 100) queue.push(fn);
  ensureLoaded();
}

export const posthog = {
  capture: (event: string, properties?: Record<string, unknown>) =>
    run((p) => p.capture(event, properties)),
  identify: (id: string, properties?: Record<string, unknown>) =>
    run((p) => p.identify(id, properties)),
  reset: () => run((p) => p.reset()),
  captureException: (error: Error) => run((p) => p.captureException(error)),
};
