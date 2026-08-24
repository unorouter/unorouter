import { captureCaughtError, logChatDebug } from "@/lib/utils/chat-debug-log";

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
// local conversation with it. The grant is not guaranteed.
export function requestPersistentStorage(): void {
  void navigator.storage
    ?.persist?.()
    .then((persisted) => logChatDebug("storage.persist", { persisted }))
    .catch((err) =>
      logChatDebug("storage.persist_error", {
        error: String(err).slice(0, 200),
      }),
    );
}

// A blank shell on iOS has three causes that look identical: WebContent killed
// for memory, a bfcache restore whose listeners no longer match the DOM, or a
// resume-time reload that never lands (WebKit #211018). pageshow.persisted
// separates the bfcache case and the heap reading separates the jetsam one.
export function installResumeDiagnostics(): void {
  window.addEventListener("pageshow", (e) => {
    const mem = performance.memory;
    logChatDebug("page.show", {
      bfcache: e.persisted,
      heapMB: mem?.usedJSHeapSize
        ? Math.round(mem.usedJSHeapSize / 1048576)
        : null,
    });
  });
  window.addEventListener("pagehide", (e) => {
    logChatDebug("page.hide", { bfcached: e.persisted });
  });
}

// Extensions that mutate the DOM (Translate, Dark Reader, Grammarly) detach
// nodes React still owns, so its next commit on a big subtree swap throws
// NotFoundError and white-screens the app. No-oping is safe: the node is
// already in the desired state.
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
