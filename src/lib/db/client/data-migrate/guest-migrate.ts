"use client";

import { env } from "@/lib/config/env";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { LOCAL_ONLY_TABLES } from "@/lib/db/schema/client";
import { logger } from "@/lib/utils/logger";
import getQueryClient from "@/lib/react-query/client";
import { getLocalDb, resetLocalDbCache } from "../client";
import { copyAllTables } from "./copy";

// Single-flight per target user; the hydrator calls migrateGuestLocalDb
// directly before Stage 1 so it never reads an empty user DB mid-copy.
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
  // Queries seeded before the copy (any mount-order path) hold empty lists;
  // refetch everything so migrated chats show without a manual refresh.
  getQueryClient().invalidateQueries();
  logger.info("Migrated guest local DB rows", {
    context: "local-db.guest-migrate",
    targetUserId,
    rows: result.copied,
    failures: result.failures.length,
  });
}
