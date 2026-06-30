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

// Streaming download. Two magic same-origin paths answered with a streamed attachment Response
// so a 500MB OPFS DB or a large diagnostics JSON downloads without ever materializing the whole
// payload (no OOM on memory-starved iOS):
//   /__download/db?u=<id>&name=<f>   - the SW reads the OPFS DB file ITSELF (origin-scoped, shared)
//                                      and streams file.stream(); no page involvement.
//   /__download/json/<token>?name=<f> - the page generates JSON in JS and posts chunks over a
//                                       MessagePort (a ReadableStream is not postMessage-transferable
//                                       before Safari 27); the SW enqueues them.
const DOWNLOAD_PREFIX = "/__download/";
const JSON_TTL_MS = 2 * 60 * 1000;

// Strip only header-breaking chars (quote, backslash, CR/LF/tab); keep dots/dashes in the name.
const sanitizeFilename = (name: string) =>
  name.replace(/["\\]/g, "_").replace(/[\r\n\t]/g, "_");

const attachmentHeaders = (
  filename: string,
  contentType: string,
  contentLength?: number,
): Headers => {
  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${sanitizeFilename(filename)}"`,
    "Cache-Control": "no-store",
  });
  if (typeof contentLength === "number")
    headers.set("Content-Length", String(contentLength));
  return headers;
};

// Pending JSON streams: token -> the stream the page feeds via its MessagePort. Diagnostics JSON
// is small now (metadata only), so no credit backpressure - enqueue and let highWaterMark apply.
type JsonEntry = {
  controller: ReadableStreamDefaultController<Uint8Array>;
  stream: ReadableStream<Uint8Array>;
  filename: string;
  createdAt: number;
};
const jsonStreams = new Map<string, JsonEntry>();

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object" || data.type !== "json-download-start")
    return;
  const port = event.ports[0];
  if (!port) return;
  const token = String(data.token);
  const now = data.now ?? 0;
  // Sweep abandoned JSON registrations.
  for (const [t, e] of jsonStreams) {
    if (now - e.createdAt > JSON_TTL_MS) {
      try {
        e.controller.error(new Error("download expired"));
      } catch {}
      jsonStreams.delete(t);
    }
  }

  let entryController!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      entryController = controller;
    },
  });
  jsonStreams.set(token, {
    controller: entryController,
    stream,
    filename: String(data.filename ?? "download.json"),
    createdAt: now,
  });

  port.onmessage = (e) => {
    const msg = e.data;
    const entry = jsonStreams.get(token);
    if (!entry || !msg) return;
    if (msg.type === "chunk") {
      try {
        entry.controller.enqueue(new Uint8Array(msg.buffer));
      } catch {}
    } else if (msg.type === "end") {
      try {
        entry.controller.close();
      } catch {}
    } else if (msg.type === "abort") {
      try {
        entry.controller.error(new Error(String(msg.error ?? "aborted")));
      } catch {}
      jsonStreams.delete(token);
    }
  };
  // ACK so the page navigates only after the stream exists.
  port.postMessage({ type: "ready" });
});

// Read the per-user OPFS DB file and stream it. Async getFile() works in a SW; file.stream() is
// lazy/disk-backed so peak memory is one chunk, not the whole DB.
async function streamOpfsDb(name: string): Promise<Response> {
  try {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(name);
    const file = await handle.getFile();
    return new Response(file.stream(), {
      status: 200,
      headers: attachmentHeaders(name, "application/octet-stream", file.size),
    });
  } catch (e) {
    return new Response(`db read failed: ${String(e)}`, { status: 500 });
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(DOWNLOAD_PREFIX)) return;
  event.stopImmediatePropagation();
  const rest = url.pathname.slice(DOWNLOAD_PREFIX.length);

  if (rest === "db") {
    // The page validated/released the SQLocal handle before navigating here; just read + stream.
    const dbName = url.searchParams.get("f");
    if (!dbName) {
      event.respondWith(new Response("missing db name", { status: 400 }));
      return;
    }
    event.respondWith(streamOpfsDb(dbName));
    return;
  }

  if (rest.startsWith("json/")) {
    const token = rest.slice("json/".length);
    const entry = jsonStreams.get(token);
    if (!entry) {
      event.respondWith(new Response("download expired", { status: 404 }));
      return;
    }
    jsonStreams.delete(token);
    event.respondWith(
      new Response(entry.stream, {
        status: 200,
        headers: attachmentHeaders(entry.filename, "application/json"),
      }),
    );
    return;
  }

  event.respondWith(new Response("not found", { status: 404 }));
});

serwist.addEventListeners();
