/// <reference lib="webworker" />
// Every caching rule in this worker is incident-derived and LOCKED; read the
// "PWA / offline" section in CLAUDE.md before changing any of them.
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

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// The DB worker script and sqlite wasm must never be SW-intercepted: a cached
// stale worker/wasm pair desyncs from the app bundle and breaks OPFS opens.
const isOpfsAsset = (url: URL, destination: RequestDestination): boolean =>
  destination === "worker" ||
  destination === "sharedworker" ||
  url.pathname.endsWith(".wasm") ||
  url.pathname.includes("sqlocal");

// Drop every Next static asset from the PRECACHE: the turbopack manifest lists
// them with a build-relative `.next/static/...` path that resolves against the
// worker scope to `/sw-worker/.next/static/...` and 404s (bad-precaching-response).
// They are served fresh and runtime-cached by the `/_next/static` CacheFirst rule
// below, so precaching them is both broken here and redundant.
const precacheEntries = (self.__SW_MANIFEST ?? []).filter((entry) => {
  const url = typeof entry === "string" ? entry : entry.url;
  return !url.includes("next/static/");
});

const serwist = new Serwist({
  precacheEntries,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/") ||
        url.pathname.startsWith("/sqlocal/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url, sameOrigin, request }) =>
        sameOrigin &&
        url.pathname.startsWith("/_next/static") &&
        !isOpfsAsset(url, request.destination),
      handler: new CacheFirst({
        cacheName: "next-static",
        plugins: [new ExpirationPlugin({ maxEntries: 2000 })],
      }),
    },
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
        url: "/en/offline",
        // Match navigations by mode too: a top-level navigation that fails on a
        // network blip / just-wiped page cache reports destination "" (not
        // "document"), so a destination-only matcher missed it and Serwist
        // rejected with "no-response" instead of serving the offline page.
        matcher: ({ request }) =>
          request.destination === "document" || request.mode === "navigate",
      },
    ],
  },
});

// Everything a deploy can invalidate. `next-static` belongs here as much as the HTML caches
// do: chunk filenames are content-hashed, so a new build's HTML asks for names the old cache
// has never held, while the old names it DOES hold are gone from the server. Keeping it
// across deploys is what produced ChunkLoadError on a stale client (NetworkFirst falls back
// to a previous build's HTML on a flaky connection, and that HTML then requests chunks that
// no longer exist). Fonts and images are content-addressed and safe to keep.
const BUILD_SCOPED_CACHES = [
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "others",
  "next-static",
];
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all(BUILD_SCOPED_CACHES.map((name) => caches.delete(name))),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    isOpfsAsset(url, event.request.destination)
  ) {
    event.stopImmediatePropagation();
  }
});

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  event?: { type?: string; data?: { model?: string } };
};

// A push MUST always end in a visible notification: Chrome shows a generic
// "site updated in background" and Safari revokes the subscription after a
// few silent pushes. Never bail early, never fetch here.
self.addEventListener("push", (event) => {
  let payload: PushPayload = {};
  try {
    payload = (event.data?.json() ?? {}) as PushPayload;
  } catch {
    payload = { body: event.data?.text() };
  }
  const title = payload.title || "UnoRouter";
  const options: NotificationOptions = {
    body: payload.body ?? "",
    icon: "/images/icons/icon-192.png",
    badge: "/images/icons/icon-192.png",
    tag: payload.event?.type
      ? `${payload.event.type}:${payload.event.data?.model ?? ""}`
      : "unorouter-notify",
    data: { url: payload.url ?? "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data as { url?: string })?.url ?? "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            void client.focus();
            if ("navigate" in client) void client.navigate(target);
            return;
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});

serwist.addEventListeners();
