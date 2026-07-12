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

// Exception-message substrings that are ALWAYS external and carry zero
// actionable signal for us (browser quirks, third-party extensions injecting
// into the page, stale-deploy chunk misses, framework hydration warnings, and
// documented-benign OPFS/bfcache states). Matched against the exception MESSAGE
// only (never the stack), so a real bug whose stack merely passes through a
// same-named frame is not silently dropped. These are fully suppressed.
const DROP_EXCEPTIONS = [
  "resizeobserver loop",
  "script error.", // cross-origin, message+stack both stripped by the browser
  "__firefox__", // firefox reader/extension probes
  "contentscriptdata", // injected content-script
  "standardselectors", // injected extension
  "wallet must has", // crypto wallet extension
  "can't access dead object", // bfcache / detached extension object
  "cannot redefine property: onurlchange", // tampermonkey/violentmonkey
  "failed to load chunk", // stale chunk after a deploy (SW/reload recovers)
  "loading chunk",
  "loading css chunk",
  "minified react error #418", // hydration flash (documented cookie-atom timing)
  "minified react error #310",
  "minified react error #185",
  "getsynchandleerror", // documented OPFS in-memory fallback
  "fell back to in-memory",
  // The raw autocaptured $exception for an empty stream; we now capture the real
  // cause explicitly as chat_stream_failed (error_type "empty_stream") with the
  // upstream request id + model, so this duplicate carries no extra signal.
  "no output generated",
  "ai_nooutputgeneratederror",
];

// Could-be-real but high-volume + mostly-external. Instead of going fully dark
// (which would hide a genuine outage), keep a SAMPLE so a real spike still
// surfaces in the trend while the steady-state noise is trimmed.
const SAMPLE_EXCEPTIONS = [
  "network error",
  "networkerror",
  "load failed",
  "failed to fetch",
  "signal is aborted",
  "operation was aborted",
  "the user aborted a request",
  "removechild", // usually translation-extension DOM race
  "insertbefore",
  "not focused", // clipboard write while tab unfocused
  "clipboard",
  "connection closed",
];
const SAMPLE_KEEP_RATE = 0.1;

// The exception MESSAGE only ($exception_values), lowercased. Deliberately does
// NOT read $exception_list (the resolved stack) so frame names never trigger a
// drop.
function exceptionMessage(properties: Record<string, unknown> | undefined) {
  const values = properties?.$exception_values;
  const types = properties?.$exception_types;
  return `${JSON.stringify(values ?? "")} ${JSON.stringify(types ?? "")}`.toLowerCase();
}

// Returns "drop" (never send), "sample" (send SAMPLE_KEEP_RATE of them), or
// null (send as-is).
function noiseVerdict(event: {
  event?: string;
  properties?: Record<string, unknown>;
}): "drop" | "sample" | null {
  if (event.event !== "$exception") return null;
  const msg = exceptionMessage(event.properties);
  if (DROP_EXCEPTIONS.some((n) => msg.includes(n))) return "drop";
  if (SAMPLE_EXCEPTIONS.some((n) => msg.includes(n))) return "sample";
  return null;
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
      // Session replay is the quota hog (events are cheap + kept 30d). The 5%
      // project sample bounds HOW MANY sessions record; this bounds how BIG each
      // one is: mask all text/inputs (also a privacy win for chat/RP content),
      // skip console noise, and don't record cross-origin iframes.
      disable_session_recording: false,
      enable_recording_console_log: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
        recordCrossOriginIframes: false,
      },
      before_send: (event) => {
        if (!event) return event;
        const verdict = noiseVerdict(event);
        if (verdict === "drop") return null;
        if (verdict === "sample" && Math.random() > SAMPLE_KEEP_RATE) return null;
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
