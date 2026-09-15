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
  "window.ethereum", // crypto wallet extension writing to the page
  "java object is gone", // android webview tearing down its js bridge
  "can't find variable: config", // in-app browser injecting a stripped global
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
  // Ours raise these (SW registration, token copy) when the browser blocks
  // storage or a permission, so they are sampled, not dropped: a real
  // regression in those paths still shows up.
  "the operation is insecure",
  "not allowed by the user agent",
];
const SAMPLE_KEEP_RATE = 0.1;

// PostHog carries two things: error triage, and the named events in
// analytics.ts (which feature was used, what was clicked). Named events never
// start with "$", so the rule is that prefix plus one exception: $exception
// itself. Everything else PostHog would send on its own is dropped here.
//
// $snapshot and $identify used to be kept. Both are gone on purpose: replay is
// off (recordings of /chat rendered the conversation in clear text, and the
// identify call sent email, username and display_name), and person_profiles is
// "never", so there is no person to attach an event to. Nothing here should
// ever be able to answer "who", only "what".
function isWantedEvent(name: string) {
  return name === "$exception" || !name.startsWith("$");
}

// The free tier is 1M events a month, ~33k a day, and past it PostHog drops
// everything for the rest of the month instead of billing. So the budget is
// the constraint and error triage is what must survive it: $exception is never
// touched by this, only by the noise filters above.
//
// Chrome, not behaviour: a tab switch, a refresh button, a dialog opening, a
// copy icon. Knowing someone opened the import picker says nothing that
// chat_conversation_imported does not say better, and these are a large share
// of the budget. Dropped outright rather than sampled, because a sampled count
// of "clicked refresh" is still worth nothing. They keep firing in
// analytics.ts, so putting one back is a line here, not re-instrumenting.
const DROP_EVENTS = new Set([
  "affiliate_tab_changed",
  "affiliate_transfer_dialog_opened",
  "billing_refreshed",
  "chat_clear_confirm_opened",
  "chat_conversation_list_paginated",
  "chat_conversation_list_searched",
  "chat_conversation_rename_cancelled",
  "chat_conversation_rename_started",
  "chat_conversation_selected",
  "chat_import_picker_opened",
  "chat_markdown_copied",
  "chat_memory_folded",
  "chat_model_auto_picked",
  "chat_overrides_drawer_opened",
  "content_copied",
  "dashboard_chart_tab_changed",
  "dashboard_date_range_changed",
  "dashboard_date_range_reset",
  "dashboard_refreshed",
  "dashboard_section_changed",
  "docs_os_tab_changed",
  "logs_filter_changed",
  "logs_filters_reset",
  "logs_model_name_copied",
  "logs_refreshed",
  "logs_token_name_copied",
  "nav_sidebar_toggled",
  "settings_theme_changed",
]);

// Real signal, but one per message or per keystroke, so they were most of the
// ~150k/day that got the named events switched off in September. A 10% sample
// still gives model share, rough message volume and what people search for;
// the rare feature events (image generated, web search toggled, branched,
// topup, token created) pass whole, since those answer which feature is used.
//
// The split between this set and DROP_EVENTS is read off the event names, not
// off data: everything has been dropped at this gate since September, so
// PostHog has no volume history. Check per-event counts after a week and move
// entries around.
const HIGH_VOLUME_EVENTS = new Set([
  "chat_auto_continued",
  "chat_group_turn",
  "chat_message_edited",
  "chat_message_regenerated",
  "chat_message_swiped",
  "chat_stream_completed",
  "models_searched",
]);
const HIGH_VOLUME_KEEP_RATE = 0.1;

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
      // No person profiles at all: events answer which feature was used, never
      // by whom. Also the cheaper tier, which is what pays for having the
      // named events switched on.
      person_profiles: "never",
      // ~48% of ingested events against a 1M/month tier, and nothing reads them.
      autocapture: false,
      capture_performance: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      // Both are on by default under `defaults`, together ~35% of everything
      // ingested. KEEP_EVENTS would drop them anyway; off here so the SDK
      // never builds them in the first place.
      capture_pageview: false,
      capture_pageleave: false,
      // Off, not masked. Masking was the answer in July (maskTextSelector "*",
      // 5% sample, 8s minimum); that got dropped when recording moved to 100%
      // of error sessions, and recordings of /chat then held the rendered
      // conversation in clear text, tied to a named user. The named events
      // below cover what replay was actually being used for.
      disable_session_recording: true,
      before_send: (event) => {
        if (!event) return event;
        if (!isWantedEvent(event.event)) return null;
        if (DROP_EVENTS.has(event.event)) return null;
        if (
          HIGH_VOLUME_EVENTS.has(event.event) &&
          Math.random() > HIGH_VOLUME_KEEP_RATE
        )
          return null;
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

// No identify and no reset on purpose: person_profiles is "never", so there is
// nobody to identify, and leaving the method here is how email and username
// found their way into PostHog the last time.
export const posthog = {
  capture: (event: string, properties?: Record<string, unknown>) =>
    run((p) => p.capture(event, properties)),
  captureException: (error: Error) => run((p) => p.captureException(error)),
};
