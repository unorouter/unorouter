"use client";

import { env } from "@/lib/config/env";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { LOCAL_ONLY_TABLES } from "@/lib/db/schema/client";
import { logger } from "@/lib/utils/logger";
import { getLocalDb, resetLocalDbCache } from "../client";
import { copyAllTables } from "./copy";

// Single-flight per target user. The hydrator runs this as its stage 0 (the
// only call site), so stage 1 always seeds the query cache from the
// post-migration DB and no separate invalidation is needed.
const guestMigrationPromises = new Map<number, Promise<void>>();

// Checks OPFS for the guest DB file WITHOUT creating it. Calling getLocalDb(0)
// would recreate an empty guest DB on every post-migration page load.
async function guestDbExists(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return false;
  }
  try {
    const root = await navigator.storage.getDirectory();
    await root.getFileHandle(
      `${env.appName.toLowerCase()}-${GUEST_USER_ID}.sqlite3`,
      { create: false },
    );
    return true;
  } catch {
    return false;
  }
}

export async function migrateGuestLocalDb(targetUserId: number): Promise<void> {
  if (targetUserId <= GUEST_USER_ID) return;
  const existing = guestMigrationPromises.get(targetUserId);
  if (existing) return existing;
  const work = runGuestMigration(targetUserId);
  guestMigrationPromises.set(targetUserId, work);
  try {
    await work;
  } finally {
    guestMigrationPromises.delete(targetUserId);
  }
}

async function runGuestMigration(targetUserId: number): Promise<void> {
  // No guest file: skip so getLocalDb(0) doesn't recreate empty after migrate.
  if (!(await guestDbExists())) return;

  const guest = await getLocalDb(GUEST_USER_ID);
  if (!guest) return;
  const target = await getLocalDb(targetUserId);
  if (!target) return;

  const result = await copyAllTables(guest, target, {
    rewrite: { user_id: targetUserId },
    skipTables: LOCAL_ONLY_TABLES,
  });

  await guest.deleteDatabaseFile();
  resetLocalDbCache();
  logger.info("Migrated guest local DB rows", {
    context: "local-db.guest-migrate",
    targetUserId,
    rows: result.copied,
    failures: result.failures.length,
  });
}
