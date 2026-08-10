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

// Fully suppressed exception classes. Every entry must be an exact error TYPE
// or a message unique to one known-benign failure (browser quirks, extension
// injections, stale-deploy chunk misses, framework hydration codes,
// documented-benign OPFS/bfcache states) - never a generic phrase a real bug
// could share. Stack-based scoping is impossible here: posthog-js hardcodes
// in_app:true on every client-side frame and only ingestion symbolification
// assigns the real value, so before_send can never tell first-party frames
// from bundled-vendor ones. Precision must come from the match string itself.
const DROP_EXCEPTIONS = [
  "resizeobserver loop",
  "script error.", // cross-origin, message+stack both stripped by the browser
  "__firefox__", // firefox reader/extension probes
  "contentscriptdata", // injected content-script
  "standardselectors", // injected extension
  "wallet must has", // crypto wallet extension
  "can't access dead object", // bfcache / detached extension object
  "permission denied to access", // firefox extension touching cross-origin obj / React __reactFiber on a DOM node
  "cannot redefine property: onurlchange", // tampermonkey/violentmonkey
  "failed to load chunk", // stale chunk after a deploy (SW/reload recovers)
  "loading chunk",
  "loading css chunk",
  "minified react error #418", // hydration flash (documented cookie-atom timing)
  "minified react error #310",
  "minified react error #185",
  "minified react error #454", // extension/translator removed <html>/<body>
  "minified react error #419", // SSR Suspense boundary bailed to client render (streaming)
  "parameter 1 is not of type 'element'", // floating-ui positioning an unmounted anchor
  "getsynchandleerror", // documented OPFS in-memory fallback
  "fell back to in-memory",
  // The raw autocaptured $exception for an empty stream; we now capture the real
  // cause explicitly as chat_stream_failed (error_type "empty_stream") with the
  // upstream request id + model, so this duplicate carries no extra signal.
  "no output generated",
  "ai_nooutputgeneratederror",
  "webassembly is not defined", // wasm disabled by hardened-browser config; shiki falls back to plain text
  // assistant-ui's own MessageRepository invariant, raised from its
  // useExternalStoreRuntime adapter swap. Upstream bug (the message text says
  // so); nothing actionable on our side.
  "a message with the same id already exists in the parent tree",
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
  "tried to unmount a fiber", // assistant-ui ResourceFiber lifecycle (upstream bug)
  "not focused", // clipboard write while tab unfocused
  "clipboard",
  "write permission denied", // firefox clipboard permission denial
  "connection closed",
];
const SAMPLE_KEEP_RATE = 0.1;

// Exception type + message only, lowercased. Never reads stack frames, so a
// frame NAME can never trigger a drop.
function exceptionMessage(properties: Record<string, unknown> | undefined) {
  // Client-side the SDK puts exceptions on $exception_list ({type, value}[]);
  // $exception_values/$exception_types only exist after server ingestion.
  const list = properties?.$exception_list;
  const fromList = Array.isArray(list)
    ? list
        .map((e: { type?: unknown; value?: unknown }) =>
          [e?.type, e?.value].filter((s) => typeof s === "string").join(" "),
        )
        .join(" ")
    : "";
  const values = properties?.$exception_values;
  const types = properties?.$exception_types;
  return `${fromList} ${JSON.stringify(values ?? "")} ${JSON.stringify(types ?? "")}`.toLowerCase();
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
      // Every automatic capture is OFF. They accounted for ~48% of ingested
      // events ($autocapture 34%, $web_vitals 8.5%, $dead_click/$dead_swipe 6%)
      // against a 1M/month tier we were projected to overrun 5.7x, and nothing
      // reads them: every funnel here runs on the named events in analytics.ts.
      // Turning one back on means accepting a six-figure monthly event bill, so
      // instrument an explicit event instead.
      autocapture: false,
      capture_performance: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      // Replay volume is bounded server-side by the project's 5% sampling +
      // 8s minimum duration (PostHog project settings, not this file). These
      // options bound how BIG each recording is: mask all text/inputs (also a
      // privacy win for chat/RP content), skip console noise, and don't record
      // cross-origin iframes.
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
        if (verdict === "sample" && Math.random() > SAMPLE_KEEP_RATE)
          return null;
        return event;
      },
    });
    instance = m.default;
    installOutboundLinkTracking(m.default);
    for (const fn of queue.splice(0)) fn(instance);
  });
}

// Maps an outbound host to a stable platform label so social/community link
// clicks group cleanly in PostHog (github/discord/reddit/... instead of raw
// hostnames). Extend by adding a host fragment.
const OUTBOUND_PLATFORMS: Array<[RegExp, string]> = [
  [/discord\.(gg|com)/, "discord"],
  [/reddit\.com/, "reddit"],
  [/github\.com/, "github"],
  [/(twitter\.com|x\.com)/, "twitter"],
  [/t\.me|telegram/, "telegram"],
  [/youtube\.com|youtu\.be/, "youtube"],
  [/producthunt\.com/, "producthunt"],
  [/linkedin\.com/, "linkedin"],
  [/huggingface\.co/, "huggingface"],
  [/bsky\.app/, "bluesky"],
];

function outboundPlatform(host: string): string {
  for (const [re, label] of OUTBOUND_PLATFORMS) if (re.test(host)) return label;
  return "other";
}

// One delegated listener covers every external anchor (current + future) so we
// don't have to touch each of the ~12 render sites. Fires for real off-site
// navigations only (different origin, http(s), left/middle click).
function installOutboundLinkTracking(ph: PostHog) {
  if (typeof document === "undefined") return;
  const handler = (e: MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    const anchor = (e.target as Element | null)?.closest?.("a");
    const href = anchor?.getAttribute("href");
    if (!href) return;
    let url: URL;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }
    if (!/^https?:$/.test(url.protocol)) return;
    if (url.host === window.location.host) return;
    ph.capture("outbound_link_clicked", {
      platform: outboundPlatform(url.host),
      host: url.host,
      url: url.href,
      link_text: anchor?.textContent?.trim().slice(0, 80) || null,
      from_path: window.location.pathname,
    });
  };
  document.addEventListener("click", handler, { capture: true, passive: true });
  document.addEventListener("auxclick", handler, {
    capture: true,
    passive: true,
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
