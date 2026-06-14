// Client crash recovery helpers shared by the global + in-app error boundaries.

    // Wipe every client-side storage surface (jotai cookies, SQLocal/OPFS DBs, local/sessionStorage, IndexedDB, SW caches). Corrupt persisted state is the usual cause of a hard crash that survives plain reloads.
export async function clearAllClientStorage() {
  try {
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0]?.trim();
      if (!name) continue;
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${name}=; path=/; domain=${location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  } catch {}
  try {
    localStorage.clear();
  } catch {}
  try {
    sessionStorage.clear();
  } catch {}
  try {
    const root = await navigator.storage?.getDirectory?.();
    if (root) {
      for await (const [name] of root.entries()) {
        await root.removeEntry(name, { recursive: true }).catch(() => {});
      }
    }
  } catch {}
  try {
    if (window.indexedDB?.databases) {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      }
    }
  } catch {}
  try {
    const keys = await caches?.keys?.();
    if (keys) await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {}
}

    // Flatten an Error (plus Next's digest) into a copy-pasteable string with full stack and cause chain so users can paste the real failure into support.
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
