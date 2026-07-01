import { logChatDebug } from "@/lib/utils/chat-debug-log";

// Global crash + storage-persistence breadcrumbs. Instrumented spots cover the known surfaces; these
// listeners catch the unknown-unknowns (any thrown error / rejected promise anywhere) so a crash
// still leaves a trail in the diagnostics export. Idempotent: safe to call once per page.
let installed = false;

export function installDebugErrorCapture(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

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

  // Ask the browser to keep OPFS persistent - iOS can evict a non-persisted DB under storage
  // pressure (a real data-loss risk on a memory-starved device). Best-effort, logged.
  void navigator.storage
    ?.persist?.()
    .then((persisted) => logChatDebug("storage.persist", { persisted }))
    .catch((err) =>
      logChatDebug("storage.persist_error", {
        error: String(err).slice(0, 200),
      }),
    );
}
