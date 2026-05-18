"use client";

import {
  cardCharacters,
  cardLorebooks,
  cards,
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversations,
  conversationSettings,
  playgroundImages,
  playgroundLikes,
  playgroundSessions,
  playgrounds,
  lorebookEntries,
  lorebooks,
  media,
  messageItems,
  messages,
  personas,
  samplingPresets,
  userThemes,
} from "@/lib/db/schema/shared";
import type { UserTheme } from "@/components/ui/theme/theme-store";
import { and, eq, type InferInsertModel } from "drizzle-orm";
import { getLocalDb } from "./client";
import { makeTableStore } from "./table-store";

// ---------------------------------------------------------------------------
// Typed write helpers paired with the read layer. Mutation hooks call these
// FIRST (IDB-primary), then mirror to server only if `syncExpiresAt != null`.
// Each function is a no-op when local DB is unavailable (SSR path).
//
// Per-table single-PK upsert / delete pairs are generated from makeTableStore.
// Composite-PK tables (conversationCharacters, cardCharacters, ...) and
// transaction-style bundle writers stay bespoke.
// ---------------------------------------------------------------------------

type LocalRowInput = Record<string, unknown>;

const characterStore = makeTableStore(characters, characters.id);
const personaStore = makeTableStore(personas, personas.id);
const lorebookStore = makeTableStore(lorebooks, lorebooks.id);
const presetStore = makeTableStore(samplingPresets, samplingPresets.id);
const cardStore = makeTableStore(cards, cards.id);
const conversationStore = makeTableStore(conversations, conversations.id);
const generationSessionStore = makeTableStore(
  playgroundSessions,
  playgroundSessions.id,
);
const generationStore = makeTableStore(playgrounds, playgrounds.id);
const messageStore = makeTableStore(messages, messages.id);
const messageItemStore = makeTableStore(messageItems, messageItems.id);
const lorebookEntryStore = makeTableStore(lorebookEntries, lorebookEntries.id);
const conversationSettingsStore = makeTableStore(
  conversationSettings,
  conversationSettings.convId,
);
const mediaStore = makeTableStore(media, media.id);

export const upsertLocalCharacter = (
  userId: number,
  row: LocalRowInput & { id: string },
) => characterStore.upsert(userId, row);

export const deleteLocalCharacter = (userId: number, id: string) =>
  characterStore.drop(userId, id);

export const upsertLocalPersona = (
  userId: number,
  row: LocalRowInput & { id: string },
) => personaStore.upsert(userId, row);

export const deleteLocalPersona = (userId: number, id: string) =>
  personaStore.drop(userId, id);

export const upsertLocalLorebook = (
  userId: number,
  row: LocalRowInput & { id: string },
) => lorebookStore.upsert(userId, row);

export const deleteLocalLorebook = (userId: number, id: string) =>
  lorebookStore.drop(userId, id);

export const upsertLocalPreset = (
  userId: number,
  row: LocalRowInput & { id: string },
) => presetStore.upsert(userId, row);

export const deleteLocalPreset = (userId: number, id: string) =>
  presetStore.drop(userId, id);

export const upsertLocalCard = (
  userId: number,
  row: LocalRowInput & { id: string },
) => cardStore.upsert(userId, row);

export const deleteLocalCard = (userId: number, id: string) =>
  cardStore.drop(userId, id);

export const upsertLocalConversation = (
  userId: number,
  row: LocalRowInput & { id: string },
) => conversationStore.upsert(userId, row);

export const deleteLocalConversation = (userId: number, id: string) =>
  conversationStore.drop(userId, id);

export const upsertLocalGenerationSession = (
  userId: number,
  row: LocalRowInput & { id: string },
) => generationSessionStore.upsert(userId, row);

export const deleteLocalGenerationSession = (userId: number, id: string) =>
  generationSessionStore.drop(userId, id);

export const upsertLocalGeneration = (
  userId: number,
  row: LocalRowInput & { id: string; sessionId: string },
) => generationStore.upsert(userId, row);

export const deleteLocalGeneration = (userId: number, id: string) =>
  generationStore.drop(userId, id);

export const upsertLocalMessage = (
  userId: number,
  row: LocalRowInput & { id: string; convId: string },
) => messageStore.upsert(userId, row, { scopeUser: false });

export const deleteLocalMessage = (userId: number, msgId: string) =>
  messageStore.drop(userId, msgId, { scopeUser: false });

export const upsertLocalMessageItem = (
  userId: number,
  row: LocalRowInput & { id: string; messageId: string },
) => messageItemStore.upsert(userId, row, { scopeUser: false });

export const upsertLocalLorebookEntry = (
  userId: number,
  row: LocalRowInput & { id: string; lorebookId: string },
) => lorebookEntryStore.upsert(userId, row, { scopeUser: false });

export const deleteLocalLorebookEntry = (userId: number, entryId: string) =>
  lorebookEntryStore.drop(userId, entryId, { scopeUser: false });

export const upsertLocalConversationSettings = (
  userId: number,
  row: LocalRowInput & { convId: string },
) => conversationSettingsStore.upsert(userId, row, { scopeUser: false });

export async function deleteLocalMessagesForConv(
  userId: number,
  convId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db.delete(messages).where(eq(messages.convId, convId));
}

export async function upsertLocalTheme(
  userId: number,
  themeJson: UserTheme,
  syncExpiresAt?: Date | null,
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  const updatedAt = new Date();
  await local.db
    .insert(userThemes)
    .values({
      userId,
      themeJson,
      syncExpiresAt: syncExpiresAt ?? null,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: userThemes.userId,
      set: { themeJson, syncExpiresAt: syncExpiresAt ?? null, updatedAt },
    });
}

// ---------------------------------------------------------------------------
// Media writer. Conversation attachments are saved as base64 inside the
// local sqlite (`data_base64` column). When the parent conversation is
// later synced to Turso, `sync.service.ts` uploads the bytes to R2 and
// stamps `r2_url` on the row so cross-device pulls only carry a pointer.
// ---------------------------------------------------------------------------

export const upsertLocalMedia = (
  userId: number,
  row: {
    id: string;
    convId: string;
    mimeType: string;
    sizeBytes: number;
    dataBase64?: string | null;
    r2Key?: string | null;
    r2Url?: string | null;
    extractedText?: string | null;
  },
) =>
  mediaStore.upsert(userId, {
    id: row.id,
    convId: row.convId,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    dataBase64: row.dataBase64 ?? null,
    r2Key: row.r2Key ?? null,
    r2Url: row.r2Url ?? null,
    extractedText: row.extractedText ?? null,
  });

export const deleteLocalMedia = (userId: number, mediaId: string) =>
  mediaStore.drop(userId, mediaId);

// ---------------------------------------------------------------------------
// Composite-PK writers (conversation bindings, generation images / likes,
// card bindings). All use onConflictDoNothing because the surrogate-key
// "do update" semantics don't apply when the conflict target is the
// natural composite primary key.
// ---------------------------------------------------------------------------

export async function upsertLocalConversationCharacter(
  userId: number,
  row: {
    convId: string;
    characterId: string;
    orderIndex?: number;
    isActive?: boolean;
    overrides?: unknown;
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .insert(conversationCharacters)
    .values({
      convId: row.convId,
      characterId: row.characterId,
      orderIndex: row.orderIndex ?? 0,
      isActive: row.isActive ?? true,
      overrides: row.overrides ?? null,
    } satisfies InferInsertModel<typeof conversationCharacters>)
    .onConflictDoNothing();
}

export async function deleteLocalConversationCharacter(
  userId: number,
  convId: string,
  characterId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .delete(conversationCharacters)
    .where(
      and(
        eq(conversationCharacters.convId, convId),
        eq(conversationCharacters.characterId, characterId),
      ),
    );
}

export async function upsertLocalGenerationImage(
  userId: number,
  row: {
    playgroundId: string;
    sequenceIndex: number;
    r2Url: string;
    r2Key: string;
    mimeType?: string;
    width?: number | null;
    height?: number | null;
    sizeBytes?: number | null;
    upstreamResultUrl?: string | null;
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .insert(playgroundImages)
    .values({
      playgroundId: row.playgroundId,
      sequenceIndex: row.sequenceIndex,
      r2Url: row.r2Url,
      r2Key: row.r2Key,
      mimeType: row.mimeType ?? "image/png",
      width: row.width ?? null,
      height: row.height ?? null,
      sizeBytes: row.sizeBytes ?? null,
      upstreamResultUrl: row.upstreamResultUrl ?? null,
    } satisfies InferInsertModel<typeof playgroundImages>)
    .onConflictDoNothing();
}

export async function upsertLocalGenerationLike(
  userId: number,
  row: { playgroundId: string; userId?: number },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .insert(playgroundLikes)
    .values({
      playgroundId: row.playgroundId,
      userId: row.userId ?? userId,
    } satisfies InferInsertModel<typeof playgroundLikes>)
    .onConflictDoNothing();
}

export async function deleteLocalGenerationLike(
  userId: number,
  playgroundId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .delete(playgroundLikes)
    .where(
      and(
        eq(playgroundLikes.playgroundId, playgroundId),
        eq(playgroundLikes.userId, userId),
      ),
    );
}

// ---------------------------------------------------------------------------
// Replace-style writers: delete-then-multi-insert. Distinct from a pure
// upsert because the caller controls the full row set for a parent id.
// ---------------------------------------------------------------------------

export async function replaceLocalMessageItems(
  userId: number,
  messageId: string,
  items: Array<LocalRowInput & { id: string }>,
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .delete(messageItems)
    .where(eq(messageItems.messageId, messageId));
  for (const it of items) {
    await local.db.insert(messageItems).values({ ...it, messageId } as never);
  }
}

export async function replaceLocalConversationBindings(
  userId: number,
  convId: string,
  bindings: {
    conversationCharacters?: Array<{
      characterId: string;
      orderIndex?: number;
      isActive?: boolean;
      overrides?: unknown;
    }>;
    conversationLorebooks?: Array<{ lorebookId: string; orderIndex?: number }>;
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  if (bindings.conversationCharacters) {
    await local.db
      .delete(conversationCharacters)
      .where(eq(conversationCharacters.convId, convId));
    for (let i = 0; i < bindings.conversationCharacters.length; i++) {
      const row = bindings.conversationCharacters[i];
      await local.db.insert(conversationCharacters).values({
        convId,
        characterId: row.characterId,
        orderIndex: row.orderIndex ?? i,
        isActive: row.isActive ?? true,
        overrides: row.overrides ?? null,
      } as never);
    }
  }
  if (bindings.conversationLorebooks) {
    await local.db
      .delete(conversationLorebooks)
      .where(eq(conversationLorebooks.convId, convId));
    for (let i = 0; i < bindings.conversationLorebooks.length; i++) {
      const row = bindings.conversationLorebooks[i];
      await local.db.insert(conversationLorebooks).values({
        convId,
        lorebookId: row.lorebookId,
        orderIndex: row.orderIndex ?? i,
      } as never);
    }
  }
}

// ---------------------------------------------------------------------------
// Bundle writers - parent + cascade children. Used by SyncStateHydrator
// stage 2 to apply server bundles atomically.
//
// No `local.transaction(...)` wrapper: SQLocal opens a real SQLite
// transaction and holds the worker's transactionMutex, but `local.db.<x>`
// queries (drizzle sqlite-proxy) don't carry the SQLocal transactionKey,
// so they wait on that same mutex and deadlock. Cascade order is enough
// here because bundle writes are idempotent upserts.
// ---------------------------------------------------------------------------

type AnyRow = Record<string, unknown> & { id: string };
// Child / junction rows: no `id` PK (composite or FK). Writer just hands them
// to Drizzle insert(); the parent's `id` is read off `bundle.<parent>.id`.
type ChildRow = Record<string, unknown>;

export async function upsertLocalLorebookBundle(
  userId: number,
  bundle: { lorebook: AnyRow; entries: AnyRow[] },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await lorebookStore.upsert(userId, bundle.lorebook);
  await local.db
    .delete(lorebookEntries)
    .where(eq(lorebookEntries.lorebookId, bundle.lorebook.id));
  for (const entry of bundle.entries) {
    await lorebookEntryStore.upsert(userId, entry, { scopeUser: false });
  }
}

export async function upsertLocalCardBundle(
  userId: number,
  bundle: {
    card: AnyRow;
    cardCharacters: Array<{
      cardId: string;
      characterId: string;
      orderIndex?: number;
    }>;
    cardLorebooks: Array<{
      cardId: string;
      lorebookId: string;
      orderIndex?: number;
    }>;
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await cardStore.upsert(userId, bundle.card);
  await local.db
    .delete(cardCharacters)
    .where(eq(cardCharacters.cardId, bundle.card.id));
  for (const row of bundle.cardCharacters) {
    await local.db.insert(cardCharacters).values({
      cardId: bundle.card.id,
      characterId: row.characterId,
      orderIndex: row.orderIndex ?? 0,
    });
  }
  await local.db
    .delete(cardLorebooks)
    .where(eq(cardLorebooks.cardId, bundle.card.id));
  for (const row of bundle.cardLorebooks) {
    await local.db.insert(cardLorebooks).values({
      cardId: bundle.card.id,
      lorebookId: row.lorebookId,
      orderIndex: row.orderIndex ?? 0,
    });
  }
}

export async function upsertLocalConversationBundle(
  userId: number,
  bundle: {
    conversation: AnyRow;
    settings: ChildRow | null;
    conversationCharacters: ChildRow[];
    conversationLorebooks: ChildRow[];
    messages: AnyRow[];
    messageItems: AnyRow[];
    media: AnyRow[];
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await conversationStore.upsert(userId, bundle.conversation);

  if (bundle.settings) {
    await local.db
      .delete(conversationSettings)
      .where(eq(conversationSettings.convId, bundle.conversation.id));
    await local.db
      .insert(conversationSettings)
      .values(bundle.settings as never);
  }

  await local.db
    .delete(conversationCharacters)
    .where(eq(conversationCharacters.convId, bundle.conversation.id));
  for (const row of bundle.conversationCharacters) {
    await local.db.insert(conversationCharacters).values(row as never);
  }

  await local.db
    .delete(conversationLorebooks)
    .where(eq(conversationLorebooks.convId, bundle.conversation.id));
  for (const row of bundle.conversationLorebooks) {
    await local.db.insert(conversationLorebooks).values(row as never);
  }

  await local.db
    .delete(messages)
    .where(eq(messages.convId, bundle.conversation.id));
  for (const m of bundle.messages) {
    await local.db.insert(messages).values(m as never);
  }

  for (const it of bundle.messageItems) {
    await local.db.insert(messageItems).values(it as never);
  }

  await local.db.delete(media).where(eq(media.convId, bundle.conversation.id));
  for (const m of bundle.media) {
    await local.db.insert(media).values(m as never);
  }
}

export async function upsertLocalGenerationSessionBundle(
  userId: number,
  bundle: {
    session: AnyRow;
    playgrounds: AnyRow[];
    playgroundImages: ChildRow[];
    playgroundLikes: ChildRow[];
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await generationSessionStore.upsert(userId, bundle.session);

  await local.db
    .delete(playgrounds)
    .where(eq(playgrounds.sessionId, bundle.session.id));
  for (const g of bundle.playgrounds) {
    await local.db.insert(playgrounds).values(g as never);
  }

  for (const img of bundle.playgroundImages) {
    await local.db.insert(playgroundImages).values(img as never);
  }

  for (const l of bundle.playgroundLikes) {
    await local.db.insert(playgroundLikes).values(l as never);
  }
}
