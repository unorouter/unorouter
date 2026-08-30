"use client";

import { env } from "@/lib/config/env";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { newSql, terminateSql } from "@/lib/db/client/new-sql";
import {
  listLocalDatabases,
  salvagePoolDatabases,
} from "@/lib/db/client/sahpool/salvage";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { logger } from "@/lib/utils/logger";

// Nothing is deleted: every `unorouter-N.sqlite3` pool stays on disk so this is
// reversible and the Recover action can still read them.
export async function adoptSingleDatabase(targetPath: string): Promise<void> {
  const local = await listLocalDatabases();
  // Content, not directory presence: a failed adoption calls deleteDatabaseFile,
  // which empties the pool but LEAVES its directory, and a presence check then
  // skips adoption forever with the history still in the legacy pool.
  if (local.some((c) => c.legacyUserId === null && c.sizeBytes > 0)) return;

  const candidates = local.filter((c) => c.legacyUserId !== null);
  if (candidates.length === 0) {
    logChatDebug("db.adopt.fresh", { targetPath });
    return;
  }

  const named = candidates.filter((c) => c.legacyUserId !== GUEST_USER_ID);
  const pool = named.length > 0 ? named : candidates;
  const source = pool.reduce((a, b) => (b.sizeBytes > a.sizeBytes ? b : a));

  logChatDebug("db.adopt.start", {
    targetPath,
    from: source.dbPath,
    fromUserId: source.legacyUserId,
    bytes: source.sizeBytes,
    candidates: candidates.map((c) => ({
      userId: c.legacyUserId,
      bytes: c.sizeBytes,
    })),
  });

  // The Blob is a VIEW, not a copy: these files reach hundreds of MB and
  // materializing one OOMs a phone.
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
    // The next open must find a verified database or none at all, never a torn one.
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
