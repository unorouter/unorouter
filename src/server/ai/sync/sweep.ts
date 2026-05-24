import { getDb } from "@/lib/db/server/client";
import { SYNC_KINDS } from "@/lib/validation/sync";
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
  await Promise.all(
    SYNC_KINDS.map((kind) => {
      const meta = SYNC_KIND_META[kind];
      return db.delete(meta.table).where(expiredSyncFilter(meta, userId, now));
    }),
  );
}
