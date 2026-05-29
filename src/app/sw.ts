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

// Service worker source compiled to public/sw.js by @serwist/next.
// COEP-safe rule: only runtime-cache SAME-ORIGIN responses. Chat + playground
// pages run cross-origin-isolated (COEP require-corp); a cached response from a
// require-corp document is still CORP-checked on replay. Same-origin /_next and
// /api responses already carry CORP same-origin (stamped in next.config.ts +
// proxy.ts), so caching them is safe. Never cache opaque cross-origin responses.

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Build-injected precache manifest (app shell + _next/static).
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // navigationPreload intentionally OFF: with it on, navigations are fetched by
  // the browser (page target), so the offline fallback only fires when both the
  // preload AND the SW fetch fail. Disabling it routes every navigation through
  // the SW's own fetch, so the /en/offline fallback triggers deterministically
  // when the network is down. Small first-navigation latency cost is acceptable.
  navigationPreload: false,
  runtimeCaching: [
    // Never cache the BFF, streaming, auth, sync, or the OPFS worker assets.
    // (SQLocal's worker + wasm bypass the SW entirely via the fetch listener
    // below; this NetworkOnly is a backstop for any /api or /sqlocal request.)
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
        request.destination !== "worker" &&
        request.destination !== "sharedworker" &&
        !url.pathname.endsWith(".wasm"),
      handler: new CacheFirst({
        cacheName: "next-static",
        plugins: [new ExpirationPlugin({ maxEntries: 256 })],
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
    // HTML navigations: fresh-first with a short timeout, offline fallback below.
    // `mode: navigate` match covers every locale-prefixed route without listing them.
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 3,
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

// SQLocal's OPFS async-proxy worker uses SharedArrayBuffer + Atomics.wait.
// Any SW fetch indirection (even NetworkOnly, which still calls fetch() inside
// the SW) stalls that sync handshake -> "Timeout while waiting for OPFS async
// proxy worker" + lost persistence. Register a passthrough listener BEFORE
// serwist's and stopImmediatePropagation so serwist never claims these
// requests: they go straight to the network, untouched by the SW.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (
    req.destination === "worker" ||
    req.destination === "sharedworker" ||
    url.pathname.endsWith(".wasm") ||
    url.pathname.includes("sqlocal")
  ) {
    // No respondWith: leave it on the native fetch path.
    event.stopImmediatePropagation();
  }
});

serwist.addEventListeners();
