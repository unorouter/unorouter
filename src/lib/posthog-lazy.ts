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
  // posthog-js (~63KB gz) plus the session recorder otherwise compete with hydration inside
  // the TBT/LCP window. Events queue in `run` meanwhile, so nothing is dropped.
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

// Never a generic phrase a real bug could share: precision must come from the match string,
// because stack-based scoping is impossible here. posthog-js hardcodes in_app:true on every
// client-side frame and only ingestion symbolification assigns the real value, so before_send
// cannot tell first-party frames from bundled-vendor ones.
const DROP_EXCEPTIONS = [
  "resizeobserver loop",
  "script error.", // cross-origin, message+stack both stripped by the browser
  "__firefox__", // firefox reader/extension probes
  "contentscriptdata", // injected content-script
  "standardselectors", // injected extension
  "wallet must has", // crypto wallet extension
  "window.webkit.messagehandlers", // iOS in-app webview bridge probing a host app we are not
  "lidnotifyid is not defined", // linkedin in-app browser injection
  "object not found matching id", // outlook/office safelinks scanner
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
  // Duplicate of chat_stream_failed (error_type "empty_stream"), which carries the upstream
  // request id + model this does not.
  "no output generated",
  "ai_nooutputgeneratederror",
  "webassembly is not defined", // wasm disabled by hardened-browser config; shiki falls back to plain text
  // assistant-ui MessageRepository invariant from its useExternalStoreRuntime adapter swap;
  // upstream bug, nothing actionable here.
  "a message with the same id already exists in the parent tree",
];

// Could-be-real but high-volume and mostly external. Dropping these entirely would hide a
// genuine outage, so a sample keeps a real spike visible in the trend.
const SAMPLE_EXCEPTIONS = [
  // 140 in 7 days, 137 from 2 Chrome iOS users (122 from ONE), empty stacks, on pages
  // sharing no code path. Reads as an injected script, not first-party recursion.
  "maximum call stack size exceeded",
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

// Type + message only, never stack frames, so a frame NAME can never trigger a drop.
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
      // These were ~48% of ingested events ($autocapture 34%, $web_vitals 8.5%,
      // $dead_click/$dead_swipe 6%) against a 1M/month tier projected to overrun 5.7x, and
      // nothing reads them. Instrument an explicit event in analytics.ts instead.
      autocapture: false,
      capture_performance: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      // Replay volume is bounded server-side by the project's 5% sampling + 8s minimum
      // duration (PostHog project settings, not this file). Rendered TEXT is deliberately
      // unmasked: `maskTextSelector: "*"` turned every recording into a wall of asterisks.
      // maskAllInputs stays on, so typed passwords and API keys are never captured.
      disable_session_recording: false,
      enable_recording_console_log: false,
      session_recording: {
        maskAllInputs: true,
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

// Stable labels so link clicks group in PostHog instead of splitting across raw hostnames.
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

// One delegated listener covers every external anchor, current and future, instead of
// instrumenting each of the ~12 render sites.
function installOutboundLinkTracking(ph: PostHog) {
  if (typeof document === "undefined") return;
  const handler = (e: MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    const anchor = e.target instanceof Element ? e.target.closest("a") : null;
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
