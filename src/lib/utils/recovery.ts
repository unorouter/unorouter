import { logChatDebug } from "@/lib/utils/chat-debug-log";

// Cache Storage plus the worker registration, and NOTHING else. A stale service
// worker can serve a dead page whose only known cure was an incognito window, but
// the usual advice ("clear site data") also destroys the OPFS chat database, which
// is the sole copy of a user's conversations. Neither of these touches OPFS.
export async function clearServiceWorkerCaches() {
  logChatDebug("recovery.clear_sw_caches");
  try {
    const keys = await caches?.keys?.();
    if (keys) await Promise.all(keys.map((k) => caches.delete(k)));
  } catch (err) {
    logChatDebug("recovery.caches_failed", {
      error: String(err).slice(0, 200),
    });
  }
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((regs ?? []).map((r) => r.unregister()));
  } catch (err) {
    logChatDebug("recovery.sw_unregister_failed", {
      error: String(err).slice(0, 200),
    });
  }
}

export async function clearAllClientStorage() {
  logChatDebug("recovery.clear_storage");
  try {
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0]?.trim();
      if (!name) continue;
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${name}=; path=/; domain=${location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  } catch (err) {
    logChatDebug("recovery.cookies_failed", {
      error: String(err).slice(0, 200),
    });
  }
  try {
    localStorage.clear();
  } catch (err) {
    logChatDebug("recovery.localstorage_failed", {
      error: String(err).slice(0, 200),
    });
  }
  try {
    sessionStorage.clear();
  } catch (err) {
    logChatDebug("recovery.sessionstorage_failed", {
      error: String(err).slice(0, 200),
    });
  }
  try {
    const root = await navigator.storage?.getDirectory?.();
    if (root) {
      for await (const [name] of root.entries()) {
        await root.removeEntry(name, { recursive: true }).catch(() => {});
      }
    }
  } catch (err) {
    logChatDebug("recovery.opfs_failed", { error: String(err).slice(0, 200) });
  }
  try {
    if (window.indexedDB?.databases) {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      }
    }
  } catch (err) {
    logChatDebug("recovery.idb_failed", { error: String(err).slice(0, 200) });
  }
  try {
    const keys = await caches?.keys?.();
    if (keys) await Promise.all(keys.map((k) => caches.delete(k)));
  } catch (err) {
    logChatDebug("recovery.caches_failed", {
      error: String(err).slice(0, 200),
    });
  }
}

// A code-split chunk failed to load: stale HTML from a previous build references a chunk the current
// build replaced. Matches Turbopack/webpack ChunkLoadError + the dynamic-import fetch failure variants.
export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: string }).name ?? "";
  const message = (error as { message?: string }).message ?? "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\w-]+ failed|Failed to load chunk|dynamically imported module|Importing a module script failed/i.test(
      message,
    )
  );
}

export function formatError(error: Error & { digest?: string }) {
  const parts = [
    `Name: ${error.name ?? "Error"}`,
    `Message: ${error.message ?? "(none)"}`,
  ];
  if (error.digest) parts.push(`Digest: ${error.digest}`);
  if (error.stack) parts.push(`\nStack:\n${error.stack}`);
  if (error.cause) {
    try {
      parts.push(`\nCause:\n${JSON.stringify(error.cause, null, 2)}`);
    } catch {
      parts.push(`\nCause:\n${String(error.cause)}`);
    }
  }
  return parts.join("\n");
}
