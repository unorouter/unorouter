"use client";

// ---------------------------------------------------------------------------
// Detect whether the browser can mount OPFS sync access handles. Required
// for SQLocal to keep data across reloads. If headers (COEP/COOP) are wrong
// or the browser is too old, SQLocal silently falls back to in-memory mode
// — we surface a toast instead of letting the user lose data.
// ---------------------------------------------------------------------------

export type OpfsStatus = "ok" | "no-opfs" | "no-sync-handle" | "no-window";

export async function probeOpfs(): Promise<OpfsStatus> {
  if (typeof window === "undefined") return "no-window";
  if (!("storage" in navigator) || !navigator.storage.getDirectory) {
    return "no-opfs";
  }
  try {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle("__opfs_probe__", { create: true });
    const sync = (handle as unknown as {
      createSyncAccessHandle?: () => Promise<unknown>;
    }).createSyncAccessHandle;
    if (typeof sync !== "function") return "no-sync-handle";
    await root.removeEntry("__opfs_probe__").catch(() => {});
    return "ok";
  } catch {
    return "no-sync-handle";
  }
}
