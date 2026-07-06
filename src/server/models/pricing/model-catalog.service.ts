import type { ProcessedModel } from "@/lib/api/pricing";
import { getDb } from "@/lib/db/server/client";
import { modelCatalog } from "@/lib/db/schema/server";
import { logger } from "@/lib/utils/logger";
import { gte, sql } from "drizzle-orm";

// Models unseen in live pricing for longer than this are genuinely retired:
// their pages 404 again and the sitemap drops them.
export const CATALOG_RETIRE_DAYS = 30;

const UPSERT_INTERVAL_MS = 5 * 60 * 1000;
let lastUpsertAt = 0;

/** Fire-and-forget snapshot of the live pricing models, throttled to one write per 5min. */
export function snapshotModelCatalog(models: ProcessedModel[]): void {
  if (!models.length) return;
  const now = Date.now();
  if (now - lastUpsertAt < UPSERT_INTERVAL_MS) return;
  lastUpsertAt = now;

  const db = getDb();
  const ts = new Date(now);
  const rows = models.map((m) => ({
    name: m.name,
    payload: m,
    isFree: m.isFree,
    firstSeenAt: ts,
    lastSeenAt: ts,
  }));
  // Chunked upserts: libSQL caps statement size; 50 rows per insert is safe.
  const run = async () => {
    for (let i = 0; i < rows.length; i += 50) {
      await db
        .insert(modelCatalog)
        .values(rows.slice(i, i + 50))
        .onConflictDoUpdate({
          target: modelCatalog.name,
          set: {
            payload: sql`excluded.payload`,
            isFree: sql`excluded.is_free`,
            lastSeenAt: sql`excluded.last_seen_at`,
          },
        });
    }
  };
  run().catch((e) => {
    lastUpsertAt = 0; // let the next request retry
    logger.error("catalog snapshot failed", {
      context: "model-catalog",
      err: String(e),
    });
  });
}

function retireCutoff(): Date {
  return new Date(Date.now() - CATALOG_RETIRE_DAYS * 24 * 60 * 60 * 1000);
}

/** A recently-seen (non-retired) catalog entry, or null. */
export async function getCatalogModel(
  matches: (name: string) => boolean,
): Promise<ProcessedModel | null> {
  const rows = await getDb()
    .select()
    .from(modelCatalog)
    .where(gte(modelCatalog.lastSeenAt, retireCutoff()));
  const row = rows.find((r) => matches(r.name));
  return row ? (row.payload as ProcessedModel) : null;
}

/** All non-retired catalog model names (the stable sitemap universe). */
export async function listCatalogNames(): Promise<string[]> {
  const rows = await getDb()
    .select({ name: modelCatalog.name })
    .from(modelCatalog)
    .where(gte(modelCatalog.lastSeenAt, retireCutoff()));
  return rows.map((r) => r.name);
}

/** Non-retired catalog entries with their vendor, for building canonical 2-segment URLs. */
export async function listCatalogEntries(): Promise<
  { name: string; vendor: string }[]
> {
  const rows = await getDb()
    .select({ name: modelCatalog.name, payload: modelCatalog.payload })
    .from(modelCatalog)
    .where(gte(modelCatalog.lastSeenAt, retireCutoff()));
  return rows.map((r) => ({
    name: r.name,
    vendor: (r.payload as ProcessedModel).vendor?.name ?? "",
  }));
}
