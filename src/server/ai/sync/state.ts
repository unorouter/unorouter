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
import type { SyncKindName } from "@/lib/validation/sync";
import { and, eq, isNotNull } from "drizzle-orm";

type SyncStateRow = {
  id: string;
  syncExpiresAt: Date | null;
  updatedAt: Date;
};

export type SyncStateBulk = Record<SyncKindName, SyncStateRow[]>;

export async function getSyncStateBulk(userId: number): Promise<SyncStateBulk> {
  const db = getDb();
  const [
    charactersRows,
    personasRows,
    lorebooksRows,
    presetsRows,
    cardsRows,
    conversationsRows,
    playgroundSessionsRows,
    themeRows,
  ] = await Promise.all([
    db
      .select({
        id: characters.id,
        syncExpiresAt: characters.syncExpiresAt,
        updatedAt: characters.updatedAt,
      })
      .from(characters)
      .where(
        and(eq(characters.userId, userId), isNotNull(characters.syncExpiresAt)),
      ),
    db
      .select({
        id: personas.id,
        syncExpiresAt: personas.syncExpiresAt,
        updatedAt: personas.updatedAt,
      })
      .from(personas)
      .where(
        and(eq(personas.userId, userId), isNotNull(personas.syncExpiresAt)),
      ),
    db
      .select({
        id: lorebooks.id,
        syncExpiresAt: lorebooks.syncExpiresAt,
        updatedAt: lorebooks.updatedAt,
      })
      .from(lorebooks)
      .where(
        and(eq(lorebooks.userId, userId), isNotNull(lorebooks.syncExpiresAt)),
      ),
    db
      .select({
        id: samplingPresets.id,
        syncExpiresAt: samplingPresets.syncExpiresAt,
        updatedAt: samplingPresets.updatedAt,
      })
      .from(samplingPresets)
      .where(
        and(
          eq(samplingPresets.userId, userId),
          isNotNull(samplingPresets.syncExpiresAt),
        ),
      ),
    db
      .select({
        id: cards.id,
        syncExpiresAt: cards.syncExpiresAt,
        updatedAt: cards.updatedAt,
      })
      .from(cards)
      .where(and(eq(cards.userId, userId), isNotNull(cards.syncExpiresAt))),
    db
      .select({
        id: conversations.id,
        syncExpiresAt: conversations.syncExpiresAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          isNotNull(conversations.syncExpiresAt),
        ),
      ),
    db
      .select({
        id: playgroundSessions.id,
        syncExpiresAt: playgroundSessions.syncExpiresAt,
        updatedAt: playgroundSessions.updatedAt,
      })
      .from(playgroundSessions)
      .where(
        and(
          eq(playgroundSessions.userId, userId),
          isNotNull(playgroundSessions.syncExpiresAt),
        ),
      ),
    db
      .select({
        userId: userThemes.userId,
        syncExpiresAt: userThemes.syncExpiresAt,
        updatedAt: userThemes.updatedAt,
      })
      .from(userThemes)
      .where(
        and(eq(userThemes.userId, userId), isNotNull(userThemes.syncExpiresAt)),
      ),
  ]);

  return {
    characters: charactersRows,
    personas: personasRows,
    lorebooks: lorebooksRows,
    presets: presetsRows,
    cards: cardsRows,
    conversations: conversationsRows,
    playgroundSessions: playgroundSessionsRows,
    theme: themeRows.map((r) => ({
      id: String(r.userId),
      syncExpiresAt: r.syncExpiresAt,
      updatedAt: r.updatedAt,
    })),
  };
}
