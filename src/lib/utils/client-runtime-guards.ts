import {
  applyDebugFlagParam,
  captureCaughtError,
  flushChatDebugLog,
  getChatDebugLog,
  logChatDebug,
  chatDebugTab,
} from "@/lib/utils/chat-debug-log";

export const RELEASE = process.env.NEXT_PUBLIC_RELEASE_VERSION ?? "dev";
const STALL_AFTER_MS = 8_000;

let errorCaptureInstalled = false;

export function installDebugErrorCapture(): void {
  if (errorCaptureInstalled || typeof window === "undefined") return;
  errorCaptureInstalled = true;

  window.addEventListener("error", (e) => {
    captureCaughtError({
      source: `window.error ${e.filename ?? ""}:${e.lineno ?? 0}`,
      error: e.error ?? e.message,
    });
    logChatDebug("window.error", {
      message: String(e.message ?? "").slice(0, 200),
      source: e.filename,
      line: e.lineno,
      col: e.colno,
      stack: e.error?.stack ? String(e.error.stack).slice(0, 500) : undefined,
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    captureCaughtError({ source: "window.unhandledrejection", error: reason });
    logChatDebug("window.unhandledrejection", {
      message: String(reason?.message ?? reason ?? "").slice(0, 200),
      stack: reason?.stack ? String(reason.stack).slice(0, 500) : undefined,
    });
  });
}

// Without this the browser can evict OPFS under storage pressure, taking every
// local conversation with it. Granted on the real origin; localhost is always
// denied without a prompt, so repeating the request there only logs noise.
let persistRequested = false;

export function requestPersistentStorage(): void {
  if (persistRequested) return;
  persistRequested = true;
  void navigator.storage
    ?.persist?.()
    .then((persisted) => {
      if (persisted) return;
      // Once per session: Safari denies a plain tab every time, and 18
      // identical lines buried the entries that mattered in one export.
      try {
        if (sessionStorage.getItem("persist-denied-logged")) return;
        sessionStorage.setItem("persist-denied-logged", "1");
      } catch {}
      logChatDebug("storage.persist_denied");
    })
    .catch((err) =>
      logChatDebug("storage.persist_error", {
        error: String(err).slice(0, 200),
      }),
    );
}

// Separates the identical-looking blank shells a resumed tab can show: a
// bfcache restore from a fresh load. heapMB would tell a jetsam kill from
// WebKit #211018 apart, but performance.memory is Chromium-only, so it is
// absent on exactly the iOS Safari those two are specific to.
export function installResumeDiagnostics(): void {
  // One line per boot naming the build and how the document arrived. A boot
  // that logs this and nothing after it died before the app came up, which is
  // the only trace a navigation killed by a worker update ever leaves.
  try {
    const at = Number(localStorage.getItem("uno-repair-at"));
    if (at) {
      localStorage.removeItem("uno-repair-at");
      logChatDebug("recovery.inline_repair", { agoMs: Date.now() - at });
    }
  } catch {}
  const nav = performance.getEntriesByType("navigation")[0];
  const bootAt = Date.now();
  // The visible tab stamps a heartbeat so the next boot can place a hang: the
  // gap between the last stamp and the last logged line is where the main
  // thread stopped, which no log line can record from inside the hang.
  const ALIVE_KEY = "uno-alive";
  let prevAlive: { agoMs: number; tab: string } | undefined;
  try {
    const raw = localStorage.getItem(ALIVE_KEY);
    const prev: unknown = raw ? JSON.parse(raw) : null;
    if (
      prev &&
      typeof prev === "object" &&
      "ts" in prev &&
      typeof prev.ts === "number" &&
      "tab" in prev &&
      typeof prev.tab === "string"
    ) {
      prevAlive = { agoMs: bootAt - prev.ts, tab: prev.tab };
    }
  } catch {}
  const beat = () => {
    if (document.visibilityState !== "visible") return;
    try {
      localStorage.setItem(
        ALIVE_KEY,
        JSON.stringify({ ts: Date.now(), tab: chatDebugTab() }),
      );
    } catch {}
  };
  beat();
  setInterval(beat, 2000);
  if (!probesInstalled) {
    probesInstalled = true;
    installStallDetector();
    installFrameGapDetector();
    installSyncCallTimers();
  }
  let wallpaperKB = 0;
  try {
    wallpaperKB = Math.round(
      (localStorage.getItem("user-theme-bg")?.length ?? 0) / 1024,
    );
  } catch {}
  const dbg = applyDebugFlagParam();
  logChatDebug("boot", {
    release: RELEASE,
    path: location.pathname,
    ...(dbg && { dbg }),
    visible: document.visibilityState === "visible",
    ...(prevAlive && { prevAlive }),
    ...(wallpaperKB && { wallpaperKB }),
    readyState: document.readyState,
    swControlled: !!navigator.serviceWorker?.controller,
    ...(nav instanceof PerformanceNavigationTiming && {
      navType: nav.type,
      transferKB: Math.round(nav.transferSize / 1024),
      responseEndMs: Math.round(nav.responseEnd),
      domCompleteMs: Math.round(nav.domComplete),
    }),
  });
  // A Link click starts a client navigation that logs nothing until the
  // target route boots, so a fetch that hangs in the worker leaves no trace.
  document.addEventListener(
    "click",
    (e) => {
      const a =
        e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement) || a.origin !== location.origin)
        return;
      logChatDebug("nav.click", { href: a.pathname, tab: chatDebugTab() });
    },
    true,
  );
  // A boot with no db.open.start after it is a page whose content never
  // mounted: a chunk still loading, or hung. Name the chunk while it is
  // still in flight, since a user who gives up at 6s leaves nothing else.
  // Only the local-first routes open the database on load; elsewhere the
  // absence of db.open.start means nothing.
  if (/^\/[a-zA-Z-]+\/(chat|image)(\/|$)/.test(location.pathname)) {
    setTimeout(() => {
      const since = getChatDebugLog().filter((e) => e.ts >= bootAt - 10_000);
      if (since.some((e) => e.event.startsWith("db.open"))) return;
      const resources = performance
        .getEntriesByType("resource")
        .filter(
          (r): r is PerformanceResourceTiming =>
            r instanceof PerformanceResourceTiming,
        );
      const inflight = resources
        .filter((r) => r.responseEnd === 0)
        .map((r) => r.name.replace(location.origin, "").slice(0, 80));
      const scripts = resources.filter((r) => /\.js(\?|$)/.test(r.name));
      logChatDebug("boot.stalled", {
        path: location.pathname,
        sinceMs: Date.now() - bootAt,
        readyState: document.readyState,
        visible: document.visibilityState === "visible",
        scriptsLoaded: scripts.filter((r) => r.responseEnd > 0).length,
        slowestScriptMs: Math.round(
          Math.max(0, ...scripts.map((r) => r.duration)),
        ),
        inflight: inflight.slice(0, 12),
      });
      flushChatDebugLog();
    }, STALL_AFTER_MS);
  }
  window.addEventListener("pageshow", (e) => {
    const heapBytes = performance.memory?.usedJSHeapSize;
    logChatDebug("page.show", {
      bfcache: e.persisted,
      ...(heapBytes && { heapMB: Math.round(heapBytes / 1048576) }),
    });
  });
  // Tells a frozen main thread (heartbeat stops, no line here) from a tab
  // iOS merely backgrounded (heartbeat stops after this line).
  document.addEventListener("visibilitychange", () => {
    logChatDebug("page.visibility", {
      state: document.visibilityState,
      sinceBootMs: Date.now() - bootAt,
    });
  });
  window.addEventListener("pagehide", (e) => {
    logChatDebug("page.hide", {
      bfcached: e.persisted,
      sinceBootMs: Date.now() - bootAt,
      opened: getChatDebugLog().some(
        (x) => x.ts >= bootAt && x.event === "db.open.start",
      ),
    });
    flushChatDebugLog();
  });
}

// Extensions that mutate the DOM (Translate, Dark Reader, Grammarly) detach nodes
// React still owns, so its next commit throws NotFoundError and white-screens the app.
let domGuardInstalled = false;

export function installDomReconciliationGuard(): void {
  if (domGuardInstalled || typeof Node === "undefined") return;
  domGuardInstalled = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(
    this: Node,
    child: T,
  ): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call<Node, [T], T>(this, child);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call<Node, [T, Node | null], T>(
        this,
        newNode,
        null,
      );
    }
    return originalInsertBefore.call<Node, [T, Node | null], T>(
      this,
      newNode,
      referenceNode,
    );
  };
}

// A tick that lands late by more than a second means the main thread was
// busy or blocked for that long. The line names the last thing logged
// before it, which is the only pointer a stall leaves.
let probesInstalled = false;
const STALL_TICK_MS = 250;
const STALL_MIN_MS = 1000;
function installStallDetector(): void {
  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    const gap = now - last - STALL_TICK_MS;
    last = now;
    if (gap < STALL_MIN_MS || document.visibilityState !== "visible") return;
    const prev = getChatDebugLog().at(-1);
    logChatDebug("main.stall", {
      gapMs: Math.round(gap),
      lastEvent: prev?.event,
      sinceLastEventMs: prev ? Date.now() - prev.ts : undefined,
    });
  }, STALL_TICK_MS);
}

// document.cookie and localStorage are the two calls on the chat mount path
// that go synchronously into the browser process; a slow one names itself.
const SYNC_SLOW_MS = 200;
function timed<TArgs extends unknown[], TResult>(
  api: string,
  fn: (...args: TArgs) => TResult,
): (...args: TArgs) => TResult {
  return function (this: unknown, ...args: TArgs) {
    const t = performance.now();
    try {
      return fn.apply(this, args);
    } finally {
      const ms = performance.now() - t;
      if (ms >= SYNC_SLOW_MS)
        logChatDebug("sync.slow", { api, ms: Math.round(ms) });
    }
  };
}
function installSyncCallTimers(): void {
  try {
    const desc = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
    if (desc?.get && desc.set && desc.configurable) {
      Object.defineProperty(Document.prototype, "cookie", {
        configurable: true,
        enumerable: desc.enumerable,
        get: timed("cookie.get", desc.get),
        set: timed("cookie.set", desc.set),
      });
    }
    const proto = Object.getPrototypeOf(localStorage);
    if (proto && typeof proto.getItem === "function") {
      proto.getItem = timed("localStorage.getItem", proto.getItem);
      proto.setItem = timed("localStorage.setItem", proto.setItem);
    }
  } catch {}
}

// Frames, not timers: a gap here with no main.stall beside it is the
// compositor or GPU, which the script thread never sees.
const FRAME_GAP_MS = 400;
const FRAME_LOG_EVERY_MS = 5000;
function installFrameGapDetector(): void {
  let last = performance.now();
  let lastLogged = 0;
  const tick = (now: number) => {
    const gap = now - last;
    last = now;
    if (
      gap >= FRAME_GAP_MS &&
      document.visibilityState === "visible" &&
      now - lastLogged >= FRAME_LOG_EVERY_MS
    ) {
      lastLogged = now;
      logChatDebug("frame.gap", { gapMs: Math.round(gap) });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
