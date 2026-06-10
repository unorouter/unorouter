import { getDb } from "@/lib/db/server/client";
import {
  cards,
  characters,
  conversations,
  lorebooks,
  personas,
  playgroundSessions,
  samplingPresets,
  userThemes,
} from "@/lib/db/schema/shared";
import type { SyncKindName } from "@/lib/validation/sync-constants";
import { and, eq, isNotNull, lt, type SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

// Single source per kind for every per-kind switch.
// Adding: SYNC_KINDS, schema, row here.

type ScopedTable = SQLiteTable & {
  id: SQLiteColumn;
  userId: SQLiteColumn;
  syncExpiresAt: SQLiteColumn;
};

// userThemes keyed by userId, no own id column.
type ThemeTable = SQLiteTable & {
  userId: SQLiteColumn;
  syncExpiresAt: SQLiteColumn;
};

type KindMeta =
  | {
      kind: "row";
      table: ScopedTable;
      idCol: SQLiteColumn;
    }
  | {
      kind: "singleton";
      table: ThemeTable;
      idCol: SQLiteColumn;
    };

export const SYNC_KIND_META: Record<SyncKindName, KindMeta> = {
  characters: {
    kind: "row",
    table: characters as ScopedTable,
    idCol: characters.id,
  },
  personas: {
    kind: "row",
    table: personas as ScopedTable,
    idCol: personas.id,
  },
  lorebooks: {
    kind: "row",
    table: lorebooks as ScopedTable,
    idCol: lorebooks.id,
  },
  presets: {
    kind: "row",
    table: samplingPresets as ScopedTable,
    idCol: samplingPresets.id,
  },
  cards: {
    kind: "row",
    table: cards as ScopedTable,
    idCol: cards.id,
  },
  conversations: {
    kind: "row",
    table: conversations as ScopedTable,
    idCol: conversations.id,
  },
  playgroundSessions: {
    kind: "row",
    table: playgroundSessions as ScopedTable,
    idCol: playgroundSessions.id,
  },
  theme: {
    kind: "singleton",
    table: userThemes as ThemeTable,
    idCol: userThemes.userId,
  },
};

export function expiredSyncFilter(
  meta: KindMeta,
  userId: number,
  now: Date,
): SQL {
  return and(
    eq(meta.table.userId, userId),
    isNotNull(meta.table.syncExpiresAt),
    lt(meta.table.syncExpiresAt, now),
  )!;
}

// Singleton kinds ignore `id` and scope to userId only.
function rowOwnershipFilter(meta: KindMeta, userId: number, id: string): SQL {
  if (meta.kind === "singleton") return eq(meta.table.userId, userId);
  return and(eq(meta.idCol, id), eq(meta.table.userId, userId))!;
}

// Read row's syncExpiresAt; null if no row.
export async function readSyncExpiry(
  userId: number,
  kind: SyncKindName,
  id: string,
): Promise<Date | null> {
  const meta = SYNC_KIND_META[kind];
  const db = getDb();
  const rows = await db
    .select({ syncExpiresAt: meta.table.syncExpiresAt })
    .from(meta.table)
    .where(rowOwnershipFilter(meta, userId, id))
    .limit(1);
  return (rows[0]?.syncExpiresAt as Date | null | undefined) ?? null;
}

// Per-userId scoped select for one kind.
export async function listSyncState(
  userId: number,
  kind: SyncKindName,
): Promise<Array<{ id: string; syncExpiresAt: Date | null; updatedAt: Date }>> {
  const meta = SYNC_KIND_META[kind];
  const db = getDb();
  const updatedAtCol = (meta.table as unknown as { updatedAt: SQLiteColumn })
    .updatedAt;
  const rows = await db
    .select({
      id: meta.idCol,
      syncExpiresAt: meta.table.syncExpiresAt,
      updatedAt: updatedAtCol,
    })
    .from(meta.table)
    .where(
      and(eq(meta.table.userId, userId), isNotNull(meta.table.syncExpiresAt))!,
    );
  return rows.map((r) => ({
    id: String(r.id),
    syncExpiresAt: r.syncExpiresAt as Date | null,
    updatedAt: r.updatedAt as Date,
  }));
}
