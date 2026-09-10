import {
  captureCaughtError,
  flushChatDebugLog,
  getChatDebugLog,
  logChatDebug,
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
  logChatDebug("boot", {
    release: RELEASE,
    path: location.pathname,
    visible: document.visibilityState === "visible",
    readyState: document.readyState,
    swControlled: !!navigator.serviceWorker?.controller,
    ...(nav instanceof PerformanceNavigationTiming && {
      navType: nav.type,
      transferKB: Math.round(nav.transferSize / 1024),
      responseEndMs: Math.round(nav.responseEnd),
      domCompleteMs: Math.round(nav.domComplete),
    }),
  });
  // A boot with no db.open.start after it is a page whose content never
  // mounted: a chunk still loading, or hung. Name the chunk while it is
  // still in flight, since a user who gives up at 6s leaves nothing else.
  // Only the local-first routes open the database on load; elsewhere the
  // absence of db.open.start means nothing.
  if (!/^\/[a-zA-Z-]+\/(chat|image)(\/|$)/.test(location.pathname)) return;
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
  window.addEventListener("pageshow", (e) => {
    const heapBytes = performance.memory?.usedJSHeapSize;
    logChatDebug("page.show", {
      bfcache: e.persisted,
      ...(heapBytes && { heapMB: Math.round(heapBytes / 1048576) }),
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
