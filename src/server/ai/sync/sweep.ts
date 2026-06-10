import { getDb } from "@/lib/db/server/client";
import { SYNC_KINDS } from "@/lib/validation/sync-constants";
import { SYNC_KIND_META, expiredSyncFilter } from "./kinds";

// Per-request memo so route-level .derive() can call sweepExpired once.
const sweptThisRequest = new WeakSet<object>();

export function sweepKey(): object {
  return {};
}

export async function sweepExpired(userId: number, key?: object) {
  if (key && sweptThisRequest.has(key)) return;
  if (key) sweptThisRequest.add(key);
  const db = getDb();
  const now = new Date();
  // Single tx so partial-sweep can't half-purge.
  await db.transaction(async (tx) => {
    for (const kind of SYNC_KINDS) {
      const meta = SYNC_KIND_META[kind];
      await tx.delete(meta.table).where(expiredSyncFilter(meta, userId, now));
    }
  });
}
