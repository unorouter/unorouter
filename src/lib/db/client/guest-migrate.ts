"use client";

import { localMeta } from "@/lib/db/schema/client";
import {
  cardCharacters,
  cardLorebooks,
  cards,
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversations,
  conversationSettings,
  lorebookEntries,
  lorebooks,
  media,
  messageItems,
  messages,
  personas,
  playgroundImages,
  playgroundLikes,
  playgrounds,
  playgroundSessions,
  samplingPresets,
  userThemes,
} from "@/lib/db/schema/shared";
import { logger } from "@/lib/utils/logger";
import { eq, inArray } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { getLocalDb, resetLocalDbCache } from "./client";

// One-shot guard key written to the target DB's `local_meta` table on
// successful migration. Bumping the suffix forces a re-run for an already-
// migrated DB if the migration logic itself changes.
const MIGRATION_KEY = "guest_migrated_v1";

const GUEST_USER_ID = 0;

export async function migrateGuestLocalDb(targetUserId: number): Promise<void> {
  if (targetUserId <= 0) return;

  const guest = await getLocalDb(GUEST_USER_ID);
  if (!guest) return;
  const target = await getLocalDb(targetUserId);
  if (!target) return;

  const existing = await target.db
    .select()
    .from(localMeta)
    .where(eq(localMeta.key, MIGRATION_KEY))
    .limit(1);
  if (existing[0]) return;

  // Pull every user-scoped row from the guest DB up-front. SQLocal's
  // transactionMutex deadlocks on parallel calls, so this is serial.
  const [
    guestConvs,
    guestChars,
    guestPersonas,
    guestLorebooks,
    guestPresets,
    guestCards,
    guestThemes,
    guestMedia,
    guestSessions,
    guestPlaygrounds,
    guestLikes,
  ] = [
    await guest.db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, GUEST_USER_ID)),
    await guest.db
      .select()
      .from(characters)
      .where(eq(characters.userId, GUEST_USER_ID)),
    await guest.db
      .select()
      .from(personas)
      .where(eq(personas.userId, GUEST_USER_ID)),
    await guest.db
      .select()
      .from(lorebooks)
      .where(eq(lorebooks.userId, GUEST_USER_ID)),
    await guest.db
      .select()
      .from(samplingPresets)
      .where(eq(samplingPresets.userId, GUEST_USER_ID)),
    await guest.db
      .select()
      .from(cards)
      .where(eq(cards.userId, GUEST_USER_ID)),
    await guest.db
      .select()
      .from(userThemes)
      .where(eq(userThemes.userId, GUEST_USER_ID)),
    await guest.db
      .select()
      .from(media)
      .where(eq(media.userId, GUEST_USER_ID)),
    await guest.db
      .select()
      .from(playgroundSessions)
      .where(eq(playgroundSessions.userId, GUEST_USER_ID)),
    await guest.db
      .select()
      .from(playgrounds)
      .where(eq(playgrounds.userId, GUEST_USER_ID)),
    await guest.db
      .select()
      .from(playgroundLikes)
      .where(eq(playgroundLikes.userId, GUEST_USER_ID)),
  ];

  const totalRows =
    guestConvs.length +
    guestChars.length +
    guestPersonas.length +
    guestLorebooks.length +
    guestPresets.length +
    guestCards.length +
    guestThemes.length +
    guestMedia.length +
    guestSessions.length +
    guestPlaygrounds.length +
    guestLikes.length;
  if (totalRows === 0) {
    await markMigrated(target.db);
    await guest.deleteDatabaseFile();
    resetLocalDbCache();
    return;
  }

  const convIds = guestConvs.map((c) => c.id);
  const cardIds = guestCards.map((c) => c.id);
  const lorebookIds = guestLorebooks.map((l) => l.id);
  const playgroundIds = guestPlaygrounds.map((p) => p.id);

  const [
    guestSettings,
    guestConvChars,
    guestConvLBs,
    guestMessages,
    guestCardChars,
    guestCardLBs,
    guestLBEntries,
    guestPlayImages,
  ] = [
    convIds.length
      ? await guest.db
          .select()
          .from(conversationSettings)
          .where(inArray(conversationSettings.convId, convIds))
      : [],
    convIds.length
      ? await guest.db
          .select()
          .from(conversationCharacters)
          .where(inArray(conversationCharacters.convId, convIds))
      : [],
    convIds.length
      ? await guest.db
          .select()
          .from(conversationLorebooks)
          .where(inArray(conversationLorebooks.convId, convIds))
      : [],
    convIds.length
      ? await guest.db
          .select()
          .from(messages)
          .where(inArray(messages.convId, convIds))
      : [],
    cardIds.length
      ? await guest.db
          .select()
          .from(cardCharacters)
          .where(inArray(cardCharacters.cardId, cardIds))
      : [],
    cardIds.length
      ? await guest.db
          .select()
          .from(cardLorebooks)
          .where(inArray(cardLorebooks.cardId, cardIds))
      : [],
    lorebookIds.length
      ? await guest.db
          .select()
          .from(lorebookEntries)
          .where(inArray(lorebookEntries.lorebookId, lorebookIds))
      : [],
    playgroundIds.length
      ? await guest.db
          .select()
          .from(playgroundImages)
          .where(inArray(playgroundImages.playgroundId, playgroundIds))
      : [],
  ];

  const messageIds = guestMessages.map((m) => m.id);
  const guestMessageItems = messageIds.length
    ? await guest.db
        .select()
        .from(messageItems)
        .where(inArray(messageItems.messageId, messageIds))
    : [];

  // Rewrite userId on parents, leave child rows untouched (they reference
  // parents via FK, parent IDs are preserved).
  const rewrite = <T extends { userId: number }>(rows: T[]): T[] =>
    rows.map((r) => ({ ...r, userId: targetUserId }));

  // No `target.transaction(...)` wrapper: SQLocal opens a real SQLite
  // transaction and holds the worker's transactionMutex, but `target.db.<x>`
  // queries (drizzle sqlite-proxy) don't carry the SQLocal transactionKey,
  // so they wait on the same mutex and deadlock. Inserts are idempotent
  // upserts with `onConflictDoNothing`, so partial failure leaves the target
  // in a forward-progress state and the next login retries.
  await insertMany(target.db, characters, rewrite(guestChars));
  await insertMany(target.db, personas, rewrite(guestPersonas));
  await insertMany(target.db, lorebooks, rewrite(guestLorebooks));
  await insertMany(target.db, lorebookEntries, guestLBEntries);
  await insertMany(target.db, samplingPresets, rewrite(guestPresets));
  await insertMany(target.db, cards, rewrite(guestCards));
  await insertMany(target.db, cardCharacters, guestCardChars);
  await insertMany(target.db, cardLorebooks, guestCardLBs);
  await insertMany(target.db, userThemes, rewrite(guestThemes));
  await insertMany(target.db, conversations, rewrite(guestConvs));
  await insertMany(target.db, conversationSettings, guestSettings);
  await insertMany(target.db, conversationCharacters, guestConvChars);
  await insertMany(target.db, conversationLorebooks, guestConvLBs);
  await insertMany(target.db, messages, guestMessages);
  await insertMany(target.db, messageItems, guestMessageItems);
  await insertMany(target.db, media, rewrite(guestMedia));
  await insertMany(target.db, playgroundSessions, rewrite(guestSessions));
  await insertMany(target.db, playgrounds, rewrite(guestPlaygrounds));
  await insertMany(target.db, playgroundImages, guestPlayImages);
  await insertMany(target.db, playgroundLikes, rewrite(guestLikes));
  await target.db
    .insert(localMeta)
    .values({
      key: MIGRATION_KEY,
      value: { migratedAt: Date.now(), rows: totalRows } as never,
    })
    .onConflictDoNothing();

  await guest.deleteDatabaseFile();
  resetLocalDbCache();
  logger.info("Migrated guest local DB rows", {
    context: "local-db.guest-migrate",
    targetUserId,
    rows: totalRows,
  });
}

async function markMigrated(db: NonNullable<Awaited<ReturnType<typeof getLocalDb>>>["db"]) {
  await db
    .insert(localMeta)
    .values({
      key: MIGRATION_KEY,
      value: { migratedAt: Date.now(), rows: 0 } as never,
    })
    .onConflictDoNothing();
}

async function insertMany(
  db: NonNullable<Awaited<ReturnType<typeof getLocalDb>>>["db"],
  table: SQLiteTable,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (rows.length === 0) return;
  // Insert one-by-one so a single bad row does not abort the batch; sqlite
  // is fast enough for guest-sized payloads.
  for (const row of rows) {
    await db
      .insert(table)
      .values(row as never)
      .onConflictDoNothing();
  }
}

