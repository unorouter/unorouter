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
            // ~900 hashed icon chunks per build; deploys purge old ones server-side, so open tabs depend on this cache. Small cap thrashed and stale tabs 404'd.
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
        // Navigations: network always wins, cache is offline-only fallback. No timeout: a timeout served stale HTML whose chunks 404 after a deploy.
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

    // Build N HTML mixed with build N+1 chunks crashes hydration; each new SW wipes these on activation (hash-addressed caches survive).
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

    // Passthrough listener (before serwist); stopImmediatePropagation keeps cross-origin requests and OPFS worker/wasm/sqlocal on the native fetch path (no respondWith), avoiding COEP-violating opaque caches and SharedArrayBuffer stalls.
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
