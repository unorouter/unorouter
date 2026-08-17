"use client";

import { env } from "@/lib/config/env";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { newSql, terminateSql } from "@/lib/db/client/new-sql";
import { sahPoolDirName } from "@/lib/db/client/sahpool/pool-name";
import {
  listLocalDatabases,
  salvagePoolDatabases,
} from "@/lib/db/client/sahpool/salvage";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { logger } from "@/lib/utils/logger";

// One database per DEVICE, replacing one per signed-in user. The old layout
// stranded a guest's chats the moment they logged in (nothing ever migrated
// them, and nothing opened `unorouter-0.sqlite3` again), kept a second pool
// alive for the rest of the session on every login, and left people unable to
// tell which of three files held their roleplay.
//
// The signed-in database wins. Guest is adopted only when it is the only one
// present, since a real account's history is the one worth keeping and the user
// was told to back that up.
//
// Nothing is deleted. Every `unorouter-N.sqlite3` pool stays on disk, so this is
// reversible and the Recover action can still read them.
export async function adoptSingleDatabase(targetPath: string): Promise<void> {
  const root = await navigator.storage.getDirectory();

  // Already adopted: the pool directory for the new path exists.
  try {
    await root.getDirectoryHandle(sahPoolDirName(targetPath));
    return;
  } catch {
    // Not adopted yet.
  }

  const candidates = await listLocalDatabases();
  if (candidates.length === 0) {
    logChatDebug("db.adopt.fresh", { targetPath });
    return;
  }

  const named = candidates.filter((c) => c.userId !== GUEST_USER_ID);
  const pool = named.length > 0 ? named : candidates;
  const source = pool.reduce((a, b) => (b.sizeBytes > a.sizeBytes ? b : a));

  logChatDebug("db.adopt.start", {
    targetPath,
    from: source.dbPath,
    fromUserId: source.userId,
    bytes: source.sizeBytes,
    candidates: candidates.map((c) => ({
      userId: c.userId,
      bytes: c.sizeBytes,
    })),
  });

  // Read the real SQLite bytes straight out of the source pool. The Blob is a
  // VIEW, not a copy: these files reach hundreds of MB and materializing one is
  // enough to OOM a phone.
  const salvaged = await salvagePoolDatabases(source.dbPath);
  const live = salvaged.find((s) => s.isLive) ?? salvaged[0];
  if (!live) {
    logChatDebug("db.adopt.no_bytes", { from: source.dbPath });
    return;
  }

  const target = newSql(targetPath);
  try {
    await target.overwriteDatabaseFile(live.blob.stream());
    const check = await target.sql<{ integrity_check: string }>(
      "PRAGMA integrity_check",
    );
    if (check[0]?.integrity_check !== "ok") {
      throw new Error(
        `adopted database failed integrity_check: ${String(
          check[0]?.integrity_check,
        ).slice(0, 100)}`,
      );
    }
    logChatDebug("db.adopt.done", {
      targetPath,
      from: source.dbPath,
      bytes: live.sizeBytes,
    });
  } catch (err) {
    // Leave nothing half-written: the next open must either find a verified
    // database or none at all, never a torn one.
    await target.deleteDatabaseFile().catch(() => {});
    logChatDebug("db.adopt.failed", { error: String(err).slice(0, 200) });
    logger.error("Single-database adoption failed", {
      context: "local-db.adopt",
      error: String(err),
    });
    throw err;
  } finally {
    await target.destroy().catch(() => {});
    terminateSql(target);
  }
}

export function singleDbPath(): string {
  return `${env.appName.toLowerCase()}.sqlite`;
}
