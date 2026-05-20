"use client";

import { env } from "@/lib/config/env";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { LOCAL_ONLY_TABLES } from "@/lib/db/schema/client";
import { logger } from "@/lib/utils/logger";
import { getLocalDb, resetLocalDbCache } from "../client";
import { copyAllTables } from "./copy";

function guestDbFileName(): string {
  return `${env.appName.toLowerCase()}-${GUEST_USER_ID}.sqlite3`;
}

// Checks OPFS for the guest DB file WITHOUT creating it. Calling getLocalDb(0)
// would recreate an empty guest DB on every post-migration page load.
async function guestDbExists(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return false;
  }
  try {
    const root = await navigator.storage.getDirectory();
    await root.getFileHandle(guestDbFileName(), { create: false });
    return true;
  } catch {
    return false;
  }
}

export async function migrateGuestLocalDb(targetUserId: number): Promise<void> {
  if (targetUserId <= GUEST_USER_ID) return;
  // No guest file means nothing to migrate. Skip so getLocalDb(0) never
  // recreates an empty guest DB after a prior migration already consumed it.
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
