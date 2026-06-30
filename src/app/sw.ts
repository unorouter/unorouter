/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

// COEP-safe: only runtime-cache same-origin responses (CORP-checked on replay); never cache opaque cross-origin.

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Build-injected precache manifest (app shell + _next/static).
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// SQLocal OPFS worker/wasm must never be SW-intercepted (SharedArrayBuffer + Atomics.wait stalls).
const isOpfsAsset = (url: URL, destination: RequestDestination): boolean =>
  destination === "worker" ||
  destination === "sharedworker" ||
  url.pathname.endsWith(".wasm") ||
  url.pathname.includes("sqlocal");

// ~900 per-icon JS chunks would re-download ~20MB per deploy if precached; runtime-cache on first use instead.
const precacheEntries = (self.__SW_MANIFEST ?? []).filter((entry) => {
  const url = typeof entry === "string" ? entry : entry.url;
  return !/\/_next\/static\/chunks\/.+\.js(\?|$)/.test(url);
});

const serwist = new Serwist({
  precacheEntries,
  skipWaiting: true,
  clientsClaim: true,
  // OFF so every navigation routes through the SW fetch and the offline fallback fires deterministically.
  navigationPreload: false,
  runtimeCaching: [
    // Backstop for /api + /sqlocal; SQLocal worker/wasm already bypass via the fetch listener below.
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/") ||
        url.pathname.startsWith("/sqlocal/"),
      handler: new NetworkOnly(),
    },
    // Immutable hashed assets, same-origin only; workers/wasm excluded so no stray OPFS chunk is cached.
    {
      matcher: ({ url, sameOrigin, request }) =>
        sameOrigin &&
        url.pathname.startsWith("/_next/static") &&
        !isOpfsAsset(url, request.destination),
      handler: new CacheFirst({
        cacheName: "next-static",
        // ~900 hashed icon chunks per build; open tabs depend on this cache, so a small cap thrashed and 404'd.
        plugins: [new ExpirationPlugin({ maxEntries: 2000 })],
      }),
    },
    // Self-hosted fonts (next/font).
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.destination === "font",
      handler: new CacheFirst({
        cacheName: "fonts",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 32,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          }),
        ],
      }),
    },
    // Images served from our origin (/_next/image, /images/*, icons).
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 128,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          }),
        ],
      }),
    },
    // Navigations: network wins, cache is offline-only. No timeout: a timeout served stale HTML whose chunks 404.
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        // Precached static shell; single en fallback covers all locales.
        url: "/en/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

// Cross-build HTML/chunk mixing crashes hydration; each new SW wipes these on activation.
const BUILD_SCOPED_CACHES = [
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "others",
];
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all(BUILD_SCOPED_CACHES.map((name) => caches.delete(name))),
  );
});

// Passthrough before serwist: cross-origin and OPFS requests stay on native fetch, avoiding COEP opaque caches.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    isOpfsAsset(url, event.request.destination)
  ) {
    event.stopImmediatePropagation();
  }
});

// Streaming download: the page pumps raw chunks (transferable ArrayBuffers - ReadableStream
// transfer needs Safari 27) over a MessagePort; we build the stream HERE and answer the magic
// URL with a streamed attachment Response. Peak memory = credits * chunk, not the whole file,
// so a 500MB OPFS DB or a large diagnostics JSON downloads without OOMing iOS.
const DOWNLOAD_PREFIX = "/__download/";
const DOWNLOAD_CREDITS = 8;
const DOWNLOAD_TTL_MS = 2 * 60 * 1000;
type DownloadEntry = {
  controller: ReadableStreamDefaultController<Uint8Array>;
  stream?: ReadableStream<Uint8Array>;
  filename: string;
  contentType: string;
  contentLength?: number;
  port: MessagePort;
  createdAt: number;
};
const downloads = new Map<string, DownloadEntry>();

// createdAt is passed in by the page (Date.now() is fine in the SW, but the page already stamps).
const sweepDownloads = (now: number) => {
  for (const [token, entry] of downloads) {
    if (now - entry.createdAt > DOWNLOAD_TTL_MS) {
      try {
        entry.controller.error(new Error("download expired"));
      } catch {}
      downloads.delete(token);
    }
  }
};

// Strip only header-breaking chars (quote, backslash, CR/LF/tab); keep dots/dashes in the name.
const sanitizeFilename = (name: string) =>
  name.replace(/["\\]/g, "_").replace(/[\r\n\t]/g, "_");

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object" || data.type !== "download-start")
    return;
  const port = event.ports[0];
  if (!port) return;
  const token = String(data.token);
  sweepDownloads(data.now ?? 0);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      downloads.set(token, {
        controller,
        filename: String(data.filename ?? "download"),
        contentType: String(data.contentType ?? "application/octet-stream"),
        contentLength:
          typeof data.contentLength === "number"
            ? data.contentLength
            : undefined,
        port,
        createdAt: data.now ?? 0,
      });
    },
    // The browser drains the body -> ask the page for one more chunk (credit-based backpressure).
    pull() {
      port.postMessage({ type: "pull" });
    },
    cancel() {
      port.postMessage({ type: "cancelled" });
      downloads.delete(token);
    },
  });
  // Stash the stream so the fetch handler can hand it to the Response.
  const created = downloads.get(token);
  if (created) created.stream = stream;

  port.onmessage = (e) => {
    const msg = e.data;
    const entry = downloads.get(token);
    if (!entry || !msg) return;
    if (msg.type === "chunk") {
      try {
        entry.controller.enqueue(new Uint8Array(msg.buffer));
      } catch {}
    } else if (msg.type === "end") {
      try {
        entry.controller.close();
      } catch {}
      downloads.delete(token);
    } else if (msg.type === "abort") {
      try {
        entry.controller.error(new Error(String(msg.error ?? "aborted")));
      } catch {}
      downloads.delete(token);
    }
  };
  // ACK so the page navigates only after the stream exists; grant the initial credit budget.
  port.postMessage({ type: "ready", credits: DOWNLOAD_CREDITS });
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(DOWNLOAD_PREFIX)) return;
  event.stopImmediatePropagation();
  const token = url.pathname.slice(DOWNLOAD_PREFIX.length);
  const entry = downloads.get(token);
  if (!entry || !entry.stream) {
    // Token unknown (SW restarted between start and navigation): 404 so the page falls back.
    event.respondWith(new Response("download expired", { status: 404 }));
    return;
  }
  const headers = new Headers({
    "Content-Type": entry.contentType,
    "Content-Disposition": `attachment; filename="${sanitizeFilename(entry.filename)}"`,
    "Cache-Control": "no-store",
  });
  if (typeof entry.contentLength === "number")
    headers.set("Content-Length", String(entry.contentLength));
  event.respondWith(new Response(entry.stream, { status: 200, headers }));
});

serwist.addEventListeners();
