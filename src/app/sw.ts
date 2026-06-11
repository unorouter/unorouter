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

// COEP-safe rule: only runtime-cache SAME-ORIGIN responses. Cached responses
// are still CORP-checked on replay under require-corp; same-origin /_next and
// /api already carry CORP same-origin. Never cache opaque cross-origin responses.

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Build-injected precache manifest (app shell + _next/static).
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// SQLocal's OPFS worker/wasm must never be SW-intercepted (SharedArrayBuffer +
// Atomics.wait handshake stalls). Shared by the _next/static matcher and the
// passthrough fetch listener.
const isOpfsAsset = (url: URL, destination: RequestDestination): boolean =>
  destination === "worker" ||
  destination === "sharedworker" ||
  url.pathname.endsWith(".wasm") ||
  url.pathname.includes("sqlocal");

// ~900 per-icon JS chunks would re-download ~20MB per deploy if precached;
// they runtime-cache on first use instead, precache keeps documents/CSS/media.
const precacheEntries = (self.__SW_MANIFEST ?? []).filter((entry) => {
  const url = typeof entry === "string" ? entry : entry.url;
  return !/\/_next\/static\/chunks\/.+\.js(\?|$)/.test(url);
});

const serwist = new Serwist({
  precacheEntries,
  skipWaiting: true,
  clientsClaim: true,
  // OFF so every navigation routes through the SW fetch and the /en/offline
  // fallback fires deterministically; with preload the fallback needs both to fail.
  navigationPreload: false,
  runtimeCaching: [
    // Backstop for /api + /sqlocal; SQLocal's worker/wasm already bypass the SW
    // via the fetch listener below.
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/") ||
        url.pathname.startsWith("/sqlocal/"),
      handler: new NetworkOnly(),
    },
    // Immutable hashed assets; same-origin only (CORP already stamped).
    // Workers/wasm are excluded so a stray OPFS chunk is never cached.
    {
      matcher: ({ url, sameOrigin, request }) =>
        sameOrigin &&
        url.pathname.startsWith("/_next/static") &&
        !isOpfsAsset(url, request.destination),
      handler: new CacheFirst({
        cacheName: "next-static",
        // Per-icon splitting puts ~900 hashed files in a build; deploys purge
        // old chunks server-side, so open tabs depend on this cache to keep
        // their build's lazy chunks clickable. 256 entries thrashed below one
        // build's worth and clicks on stale tabs 404'd.
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
    // Navigations: network always wins, cache is offline-only fallback. No
    // networkTimeoutSeconds: a timeout served the previous build's HTML on slow
    // links, whose chunks 404 after a deploy and kill every event handler.
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

// HTML/RSC from build N mixed with build N+1 chunks crashes hydration; each
// new SW wipes these on activation. Hash-addressed caches survive (immutable).
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

// Passthrough listener, runs before serwist's; stopImmediatePropagation keeps
// these requests on the native fetch path (no respondWith):
// 1) Cross-origin: defaultCache's regex/catch-all rules would NetworkFirst
//    third-party requests (cloudflareinsights beacon etc.); an adblocked or
//    offline fetch then rejects with a loud no-response error and a cached
//    opaque response would violate the COEP rule above.
// 2) OPFS worker/wasm/sqlocal (isOpfsAsset) so the SharedArrayBuffer handshake
//    is never stalled by SW fetch indirection.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    isOpfsAsset(url, event.request.destination)
  ) {
    event.stopImmediatePropagation();
  }
});

serwist.addEventListeners();
