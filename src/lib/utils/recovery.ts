import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { isRecord, webStorage } from "@/lib/utils/base";

async function step(event: string, run: () => unknown): Promise<void> {
  try {
    await run();
  } catch (err) {
    logChatDebug(event, { error: String(err).slice(0, 200) });
  }
}

const deleteCaches = () =>
  step("recovery.caches_failed", async () => {
    const keys = await caches?.keys?.();
    if (keys) await Promise.all(keys.map((k) => caches.delete(k)));
  });

async function clearServiceWorkerCaches() {
  logChatDebug("recovery.clear_sw_caches");
  await deleteCaches();
  await step("recovery.sw_unregister_failed", async () => {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((regs ?? []).map((r) => r.unregister()));
  });
}

// Wipes OPFS, DESTROYING the local chat DB, which is the user's only copy. For a
// caching problem use clearServiceWorkerCaches instead.
export async function clearAllClientStorage() {
  logChatDebug("recovery.clear_storage");
  await step("recovery.cookies_failed", () => {
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0]?.trim();
      if (!name) continue;
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${name}=; path=/; domain=${location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  });
  await step("recovery.localstorage_failed", () => localStorage.clear());
  await step("recovery.sessionstorage_failed", () => sessionStorage.clear());
  // OPFS refuses removeEntry while the sqlocal worker holds a sync access
  // handle, so deleting the files is not enough: the worker has to go first.
  await step("recovery.opfs_failed", async () => {
    const { wipeLocalDb } = await import("@/lib/db/client/client");
    await wipeLocalDb();
  });
  await step("recovery.idb_failed", async () => {
    if (!window.indexedDB?.databases) return;
    for (const db of await window.indexedDB.databases()) {
      if (db.name) window.indexedDB.deleteDatabase(db.name);
    }
  });
  await deleteCaches();
}

export function isChunkLoadError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const name = typeof error.name === "string" ? error.name : "";
  const message = typeof error.message === "string" ? error.message : "";
  return (
    name === "ChunkLoadError" ||
    /Loading chunk [\w-]+ failed|Failed to load chunk|dynamically imported module|Importing a module script failed/i.test(
      message,
    )
  );
}

const CHUNK_RELOAD_KEY = "chunk-reload-once";

// The chunk URL is in the message, and the failing entry is usually in the
// BROWSER cache: a rollout 404 was once served with a one-year max-age, and no
// edge purge reaches that. cache: "reload" refetches past the HTTP cache and
// replaces the entry. During a rollout the chunk request can also land on a pod
// of the other build and 404, so it retries a few times before giving up.
export async function repairChunks(error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const urls = message.match(/\/_next\/static\/[^\s"')]+/g) ?? [];
  for (let attempt = 0; attempt < 4; attempt++) {
    const ok = await Promise.all(
      urls.map((u) =>
        fetch(u, { cache: "reload" }).then(
          (r) => r.ok,
          () => false,
        ),
      ),
    );
    if (ok.every(Boolean)) break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  await clearServiceWorkerCaches().catch(() => {});
}

// Both error boundaries (route and global) reload once on a chunk error; the
// session flag stops a loop when the chunk is truly gone, and without session
// storage there is no auto reload at all. Caches AND the worker go before the
// reload: deleting caches alone left a wedged worker serving it the same way.
export function recoverChunkError(error: unknown): void {
  if (!isChunkLoadError(error)) return;
  const session = webStorage("sessionStorage");
  const willReload = !!session && !session.getItem(CHUNK_RELOAD_KEY);
  logChatDebug("chunk.load_error", {
    message: String(error instanceof Error ? error.message : error).slice(
      0,
      200,
    ),
    willReload,
  });
  if (!session || !willReload) return;
  session.setItem(CHUNK_RELOAD_KEY, "1");
  void repairChunks(error).then(() => window.location.reload());
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
