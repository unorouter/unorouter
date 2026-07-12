import { IS_DEV, POSTHOG_DISABLED } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import type { PostHog } from "posthog-js";

let instance: PostHog | null = null;
let loading = false;
const queue: Array<(p: PostHog) => void> = [];

function ensureLoaded() {
  if (instance || loading || IS_DEV || POSTHOG_DISABLED || !env.posthogHost) {
    return;
  }
  loading = true;
  // Load after window load + idle: posthog-js (~63KB gz) plus the session
  // recorder otherwise compete with hydration inside the TBT/LCP window.
  // Events queue in `run` meanwhile, so nothing is dropped.
  const idle = (cb: () => void) =>
    "requestIdleCallback" in window
      ? window.requestIdleCallback(cb, { timeout: 5000 })
      : setTimeout(cb, 2000);
  const afterLoad = (cb: () => void) =>
    document.readyState === "complete"
      ? cb()
      : window.addEventListener("load", () => cb(), { once: true });
  afterLoad(() => idle(loadNow));
}

// Browser/extension/network junk and unactionable framework noise that would
// otherwise flood error tracking and burn ingest quota. Matched case-insensitive
// against the exception message. Real app errors are never in this list.
const EXCEPTION_NOISE = [
  "resizeobserver loop",
  "script error.",
  "__firefox__",
  "failed to load chunk",
  "loading chunk",
  "loading css chunk",
  "minified react error #418",
  "minified react error #310",
  "minified react error #185",
  "networkerror",
  "network error",
  "load failed",
  "failed to fetch",
  "signal is aborted",
  "operation was aborted",
  "the user aborted a request",
  "getsynchandleerror",
  "fell back to in-memory",
  "can't access dead object",
  "not focused",
  "clipboard",
  "removechild",
  "insertbefore",
  "unmount a fiber",
  "already unmounted",
  "permission denied to access object",
  "blocked a frame",
  "securityerror",
  "contentscriptdata",
  "standardselectors",
  "wallet must has",
  "respondwith received an error",
  "connection closed",
  "notallowederror",
  "router state header",
  // The raw autocaptured $exception for an empty stream; we capture the real
  // cause explicitly as chat_stream_failed (error_type "empty_stream") with the
  // upstream request id + model, so this duplicate carries no extra signal.
  "no output generated",
  "ai_nooutputgeneratederror",
];

function isNoiseException(event: {
  event?: string;
  properties?: Record<string, unknown>;
}): boolean {
  if (event.event !== "$exception") return false;
  const list = event.properties?.$exception_list;
  const values = event.properties?.$exception_values;
  const hay = JSON.stringify(list ?? values ?? "").toLowerCase();
  return EXCEPTION_NOISE.some((n) => hay.includes(n));
}

function loadNow() {
  void import("posthog-js").then((m) => {
    m.default.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: env.posthogHost,
      ui_host: "https://eu.posthog.com",
      defaults: "2026-01-30",
      capture_performance: true,
      capture_heatmaps: true,
      capture_dead_clicks: true,
      before_send: (event) => {
        if (event && isNoiseException(event)) return null;
        return event;
      },
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
