import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/server/client";
import { instanceLeases } from "@/lib/db/schema";

const HOLDER = process.env.INSTANCE_ID || process.env.HOSTNAME || randomUUID();

export function instanceId(): string {
  return HOLDER;
}

/**
 * Cross-container mutual exclusion via a Turso lease row. The upsert only takes
 * the lease when we already hold it or the current lease has lapsed, so exactly
 * one instance wins; a dead holder's lease frees after ttlMs and another takes it.
 */
export async function acquireOrRenewLease(
  name: string,
  ttlMs: number,
): Promise<boolean> {
  const db = getDb();
  const now = Date.now();
  const expiresAt = new Date(now + ttlMs);

  const rows = await db
    .insert(instanceLeases)
    .values({ name, holder: HOLDER, expiresAt })
    .onConflictDoUpdate({
      target: instanceLeases.name,
      set: {
        holder: sql`excluded.holder`,
        expiresAt: sql`excluded.expires_at`,
      },
      setWhere: sql`${instanceLeases.holder} = excluded.holder OR ${instanceLeases.expiresAt} < ${now}`,
    })
    .returning({ holder: instanceLeases.holder });

  return rows[0]?.holder === HOLDER;
}
