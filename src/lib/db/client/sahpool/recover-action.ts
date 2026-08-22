"use client";

import { env } from "@/lib/config/env";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { logger } from "@/lib/utils/logger";
import { dayjs } from "@/lib/utils/format/date";

export type RecoverOutcome =
  { kind: "none" } | { kind: "saved"; candidates: number; sizeBytes: number };

// Scan the OPFS pool for a database the VFS lost the name mapping for and write
// the largest hit out as a file. Deliberately independent of the DB studio: the
// studio mounts a table viewer that reads the live database, and a user whose db
// is huge or damaged cannot load it, which is precisely when recovery is needed.
export async function runRecoverOrphanedDb(): Promise<RecoverOutcome> {
  logChatDebug("db.salvage.start", {});
  const { listLocalDatabases, salvagePoolDatabases } =
    await import("@/lib/db/client/sahpool/salvage");
  // Includes the legacy per-user pools that adoption leaves on disk, which is
  // exactly where the bytes are when someone needs this button.
  const paths = (await listLocalDatabases()).map((db) => db.dbPath);
  const found = (
    await Promise.all(paths.map((p) => salvagePoolDatabases(p)))
  ).flat();
  found.sort((a, b) => b.sizeBytes - a.sizeBytes);
  // Record the storage estimate alongside the result: "found nothing" is only
  // meaningful next to how much OPFS is actually in use. A large usage with no
  // candidates means the bytes are somewhere the scan does not reach, which is
  // a different problem from the data being genuinely gone.
  const estimate = await navigator.storage?.estimate?.().catch(() => null);
  if (found.length === 0) {
    logChatDebug("db.salvage.done", {
      candidates: 0,
      storageUsage: estimate?.usage ?? null,
    });
    return { kind: "none" };
  }

  const biggest = found[0]!;
  const { streamFileToDisk } = await import("@/lib/utils/client");
  const stamp = dayjs().format("YYYYMMDD-HHmmss");
  const fileName = `${env.appName.toLowerCase()}-recovered-${stamp}.sqlite`;
  // File wraps the Blob VIEW without copying, so the bytes stream from OPFS to
  // disk and never sit in the heap.
  await streamFileToDisk(
    new File([biggest.blob], fileName, {
      type: "application/octet-stream",
    }),
    fileName,
  );
  logChatDebug("db.salvage.done", {
    candidates: found.length,
    bytes: biggest.sizeBytes,
    source: biggest.source,
    storageUsage: estimate?.usage ?? null,
  });
  logger.info("Recovered an orphaned local database", {
    context: "local-db.salvage",
    candidates: found.length,
    bytes: biggest.sizeBytes,
  });
  return {
    kind: "saved",
    candidates: found.length,
    sizeBytes: biggest.sizeBytes,
  };
}
