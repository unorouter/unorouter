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

// Never add a generic phrase a real bug could share: stack-based scoping is
// impossible here (posthog-js hardcodes in_app:true on every client frame).
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
  "minified react error #419", // CSR bailout: next/dynamic ssr:false, not <Suspense>
  "parameter 1 is not of type 'element'", // floating-ui positioning an unmounted anchor
  "getsynchandleerror", // documented OPFS in-memory fallback
  "fell back to in-memory",
  "no output generated", // duplicate of chat_stream_failed "empty_stream"
  "ai_nooutputgeneratederror",
  "webassembly is not defined", // wasm disabled by hardened-browser config; shiki falls back to plain text
  "a message with the same id already exists in the parent tree", // assistant-ui upstream bug
];

// Sampled, not dropped: a full drop would hide a genuine outage.
const SAMPLE_EXCEPTIONS = [
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
      // ~48% of ingested events against a 1M/month tier, and nothing reads them.
      autocapture: false,
      capture_performance: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      // maskAllInputs stays ON: it is what keeps typed passwords and API keys out
      // of recordings. Rendered text is deliberately unmasked.
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
