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
import { and, eq, isNotNull, lt } from "drizzle-orm";

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
  await Promise.all([
    db
      .delete(characters)
      .where(
        and(
          eq(characters.userId, userId),
          isNotNull(characters.syncExpiresAt),
          lt(characters.syncExpiresAt, now),
        ),
      ),
    db
      .delete(personas)
      .where(
        and(
          eq(personas.userId, userId),
          isNotNull(personas.syncExpiresAt),
          lt(personas.syncExpiresAt, now),
        ),
      ),
    db
      .delete(lorebooks)
      .where(
        and(
          eq(lorebooks.userId, userId),
          isNotNull(lorebooks.syncExpiresAt),
          lt(lorebooks.syncExpiresAt, now),
        ),
      ),
    db
      .delete(samplingPresets)
      .where(
        and(
          eq(samplingPresets.userId, userId),
          isNotNull(samplingPresets.syncExpiresAt),
          lt(samplingPresets.syncExpiresAt, now),
        ),
      ),
    db
      .delete(cards)
      .where(
        and(
          eq(cards.userId, userId),
          isNotNull(cards.syncExpiresAt),
          lt(cards.syncExpiresAt, now),
        ),
      ),
    db
      .delete(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          isNotNull(conversations.syncExpiresAt),
          lt(conversations.syncExpiresAt, now),
        ),
      ),
    db
      .delete(playgroundSessions)
      .where(
        and(
          eq(playgroundSessions.userId, userId),
          isNotNull(playgroundSessions.syncExpiresAt),
          lt(playgroundSessions.syncExpiresAt, now),
        ),
      ),
    db
      .delete(userThemes)
      .where(
        and(
          eq(userThemes.userId, userId),
          isNotNull(userThemes.syncExpiresAt),
          lt(userThemes.syncExpiresAt, now),
        ),
      ),
  ]);
}
