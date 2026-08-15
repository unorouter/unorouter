import { logChatDebug } from "@/lib/utils/chat-debug-log";

let errorCaptureInstalled = false;

// Mirrors uncaught errors into the exportable debug log, so a bug report
// arrives with a stack instead of "it broke".
export function installDebugErrorCapture(): void {
  if (errorCaptureInstalled || typeof window === "undefined") return;
  errorCaptureInstalled = true;

  window.addEventListener("error", (e) => {
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
    logChatDebug("window.unhandledrejection", {
      message: String(reason?.message ?? reason ?? "").slice(0, 200),
      stack: reason?.stack ? String(reason.stack).slice(0, 500) : undefined,
    });
  });
}

// Without this the browser can evict OPFS under storage pressure, taking every
// local conversation with it. The grant is not guaranteed, hence the log line.
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

// Extensions that mutate the DOM (Translate, Dark Reader, Grammarly) detach
// nodes React still owns, so its next commit on a big subtree swap throws
// NotFoundError and white-screens the app. The node is already in the desired
// state, so no-oping is safe. Standard React + Google-Translate survival patch.
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
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
