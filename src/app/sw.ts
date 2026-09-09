/// <reference lib="webworker" />
// Every caching rule here is incident-derived; read "PWA / service worker" in CLAUDE.md first.
import { defaultCache } from "@serwist/turbopack/worker";
import type {
  PrecacheEntry,
  RouteHandlerCallbackOptions,
  SerwistGlobalConfig,
} from "serwist";
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

const isOpfsAsset = (url: URL, destination: RequestDestination): boolean =>
  destination === "worker" ||
  destination === "sharedworker" ||
  url.pathname.endsWith(".wasm") ||
  url.pathname.includes("sqlocal");

// The turbopack manifest lists Next static assets build-relative, so they
// resolve against the worker scope and 404 (bad-precaching-response).
const precacheEntries = (self.__SW_MANIFEST ?? []).filter((entry) => {
  const url = typeof entry === "string" ? entry : entry.url;
  return !url.includes("next/static/");
});

const OFFLINE_URL = "/en/offline";

const NAV_HANG_MS = 10_000;

// The worker has no log of its own, and a navigation or RSC fetch that hangs
// in here leaves nothing in the page log either: the page that asked never
// boots. Every open page gets the line, so a sibling tab records what the
// stuck one cannot.
const swLog = async (
  event: string,
  data: Record<string, unknown>,
): Promise<void> => {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clients) {
    client.postMessage({ type: "SW_LOG", event, data });
  }
};

const navStrategy = new NetworkFirst({ cacheName: "pages" });

const handleNavigation = async (
  options: RouteHandlerCallbackOptions,
): Promise<Response> => {
  const path = options.url.pathname;
  const t0 = Date.now();
  void swLog("sw.nav.start", { path });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const raced = await Promise.race([
    navStrategy.handle(options).catch(() => undefined),
    new Promise<undefined>((resolve) => {
      timer = setTimeout(() => resolve(undefined), NAV_HANG_MS);
    }),
  ]);
  if (timer) clearTimeout(timer);
  void swLog("sw.nav.done", {
    path,
    ms: Date.now() - t0,
    status: raced?.status ?? null,
    offline: !raced,
  });
  if (raced) return raced;
  return (await serwist.matchPrecache(OFFLINE_URL)) ?? Response.error();
};

// Serwist's own RSC entries are NetworkFirst with no timeout, so a client-side
// Link click on a bad connection waits on the socket forever with no UI: the
// page looks frozen. Same cap as navigations; on timeout the cached payload is
// served, and with none Next falls back to a document navigation.
const rscPlugins = () => [
  new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 }),
];
const rscStrategy = new NetworkFirst({
  cacheName: "pages-rsc",
  networkTimeoutSeconds: NAV_HANG_MS / 1000,
  plugins: rscPlugins(),
});
const rscPrefetchStrategy = new NetworkFirst({
  cacheName: "pages-rsc-prefetch",
  networkTimeoutSeconds: NAV_HANG_MS / 1000,
  plugins: rscPlugins(),
});

const handleRsc = async (
  options: RouteHandlerCallbackOptions,
): Promise<Response> => {
  const path = options.url.pathname;
  const t0 = Date.now();
  void swLog("sw.rsc.start", { path });
  try {
    const res = await rscStrategy.handle(options);
    void swLog("sw.rsc.done", { path, ms: Date.now() - t0, status: res.status });
    return res;
  } catch (err) {
    void swLog("sw.rsc.done", {
      path,
      ms: Date.now() - t0,
      error: String(err).slice(0, 120),
    });
    throw err;
  }
};

const isRsc = (request: Request, sameOrigin: boolean, pathname: string) =>
  sameOrigin &&
  request.headers.get("RSC") === "1" &&
  !pathname.startsWith("/api/");

const serwist = new Serwist({
  precacheEntries,
  // Off on purpose. With both on, every deploy yanked the worker out from
  // under every open tab at once and forced a reload on each: thirteen
  // deploys in one evening meant thirteen forced reloads per user. A new
  // worker now waits; a page applies it via SKIP_WAITING only when idle and
  // visible (see sw-register), other tabs pick it up on their next
  // navigation, and a first install still activates on its own.
  skipWaiting: false,
  clientsClaim: false,
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
      handler: handleNavigation,
    },
    {
      matcher: ({ request, sameOrigin, url }) =>
        isRsc(request, sameOrigin, url.pathname) &&
        request.headers.get("Next-Router-Prefetch") === "1",
      handler: rscPrefetchStrategy,
    },
    {
      matcher: ({ request, sameOrigin, url }) =>
        isRsc(request, sameOrigin, url.pathname),
      handler: handleRsc,
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        // A FAILING top-level navigation reports destination "", not "document".
        matcher: ({ request }) =>
          request.destination === "document" || request.mode === "navigate",
      },
    ],
  },
});

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

// Safari kills the OLD worker the moment a new one finishes installing, even
// without skipWaiting, and a page whose navigation is still in flight under
// the old worker then never finishes loading: stuck progress bar, stop button
// dead, every page in that browser session wedged until the app is quit. Our
// install takes milliseconds and a cold mobile boot takes seconds, so under
// frequent deploys a direct load of a heavy route lost that race routinely.
// Hold install until no open page is still loading, capped so a frozen
// background tab cannot block updates forever.
const INSTALL_GATE_MS = 60_000;
const INSTALL_POLL_MS = 1_000;

const askReadyState = (client: Client): Promise<string> =>
  new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve("unknown"), INSTALL_POLL_MS);
    channel.port1.onmessage = (e) => {
      clearTimeout(timer);
      resolve(typeof e.data === "string" ? e.data : "unknown");
    };
    client.postMessage({ type: "READY_STATE" }, [channel.port2]);
  });

async function waitForPagesToLoad(): Promise<void> {
  const deadline = Date.now() + INSTALL_GATE_MS;
  while (Date.now() < deadline) {
    const clients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    const loading = await Promise.all(
      clients.map(async (client) => {
        const state = await askReadyState(client);
        if (state === "complete") return false;
        // No reply is what a page still streaming its HTML looks like: it has
        // no JavaScript yet to answer with. Treating that as "not loading"
        // let an install through at exactly the wrong moment (a user's
        // /image tab, hung, showed up as clients:2 with the gate waiting 1s).
        // Only a HIDDEN silent page is skipped: it is a frozen background
        // tab, not a navigation in front of anyone, and the cap covers it.
        if (state === "unknown" && client.visibilityState !== "visible")
          return false;
        return true;
      }),
    );
    if (!loading.some(Boolean)) return;
    await new Promise((r) => setTimeout(r, INSTALL_POLL_MS));
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const t0 = Date.now();
      await waitForPagesToLoad();
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({
          type: "INSTALL_GATE",
          waitedMs: Date.now() - t0,
          clients: clients.length,
        });
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
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

function isRec(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function rec(value: unknown): Record<string, unknown> | undefined {
  return isRec(value) ? value : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function pushPayload(raw: unknown): PushPayload {
  const root = rec(raw);
  if (!root) return {};
  const event = rec(root.event);
  const data = event && rec(event.data);
  return {
    title: str(root.title),
    body: str(root.body),
    url: str(root.url),
    ...(event && {
      event: {
        type: str(event.type),
        ...(data && { data: { model: str(data.model) } }),
      },
    }),
  };
}

// A push MUST always end in a visible notification: Safari revokes the
// subscription after a few silent ones.
self.addEventListener("push", (event) => {
  let payload: PushPayload = {};
  try {
    payload = pushPayload(event.data?.json());
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
  const target = str(rec(event.notification.data)?.url) || "/";
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
