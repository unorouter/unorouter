"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
import { LOCAL_ONLY_TABLES } from "@/lib/db/schema/client";
import { logger } from "@/lib/utils/logger";
import { getLocalDb, resetLocalDbCache } from "../client";
import { copyAllTables } from "./copy";

export async function migrateGuestLocalDb(targetUserId: number): Promise<void> {
  if (targetUserId <= GUEST_USER_ID) return;
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
