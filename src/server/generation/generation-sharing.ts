import { assertFound } from "@/lib/db/assertions";
import { getDb } from "@/lib/db/client";
import { generationSessions } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import dayjs from "dayjs";
import { and, eq } from "drizzle-orm";
import { getSessionRow, listSnapshotsWithImages } from "./generation-reads";

// ---------------------------------------------------------------------------
// Sharing (session-level)
// ---------------------------------------------------------------------------

export async function createShareLink(userId: number, sessionId: string) {
  const db = getDb();
  const existing = await getSessionRow(userId, sessionId);
  if (existing.shareId) return { shareId: existing.shareId };
  const shareId = uid(12);
  const result = await db
    .update(generationSessions)
    .set({ shareId, updatedAt: dayjs().toDate() })
    .where(
      and(
        eq(generationSessions.id, sessionId),
        eq(generationSessions.userId, userId),
      ),
    )
    .returning({ id: generationSessions.id });
  assertFound(result);
  return { shareId };
}

export async function revokeShareLink(userId: number, sessionId: string) {
  const db = getDb();
  const result = await db
    .update(generationSessions)
    .set({ shareId: null, updatedAt: dayjs().toDate() })
    .where(
      and(
        eq(generationSessions.id, sessionId),
        eq(generationSessions.userId, userId),
      ),
    )
    .returning({ id: generationSessions.id });
  assertFound(result);
  return { id: sessionId };
}

/** Public read: anyone with the shareId sees the whole session history. */
export async function getSharedSession(shareId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(generationSessions)
    .where(eq(generationSessions.shareId, shareId))
    .limit(1);
  assertFound(rows);
  const session = rows[0];
  const snapshots = await listSnapshotsWithImages(session.id);
  const safeSnapshots = snapshots.map((s) => {
    const { submittedKey: _sk, ...safe } = s;
    return safe;
  });
  return { session, snapshots: safeSnapshots };
}
