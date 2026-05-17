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
  generationImages,
  generationLikes,
  generationSessions,
  generations,
  lorebookEntries,
  lorebooks,
  media,
  messageItems,
  messages,
  personas,
  samplingPresets,
  userThemes,
} from "@/lib/db/schema/shared";
import type { UserTheme } from "@/store/theme-store";
import { and, eq } from "drizzle-orm";
import { getLocalDb } from "./client";

// ---------------------------------------------------------------------------
// Typed write helpers paired with the read layer. Mutation hooks call these
// FIRST (IDB-primary), then mirror to server only if `syncExpiresAt != null`.
// Each function is a no-op when local DB is unavailable (SSR path).
// ---------------------------------------------------------------------------

type LocalRowInput = Record<string, unknown>;

export async function upsertLocalCharacter(
  userId: number,
  row: LocalRowInput & { id: string },
) {
  const local = await getLocalDb(userId);
  if (!local) {
    console.warn("[writes] upsertLocalCharacter: no local db", { userId });
    return;
  }
  try {
    await local.db
      .insert(characters)
      .values(({ ...row, userId } as never))
      .onConflictDoUpdate({ target: characters.id, set: row as never });
    console.log("[writes] upsertLocalCharacter OK", { id: row.id });
  } catch (e) {
    console.error("[writes] upsertLocalCharacter failed", e);
  }
}

export async function deleteLocalCharacter(userId: number, id: string) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .delete(characters)
    .where(and(eq(characters.id, id), eq(characters.userId, userId)));
}

export async function upsertLocalPersona(
  userId: number,
  row: LocalRowInput & { id: string },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .insert(personas)
    .values(({ ...row, userId } as never))
    .onConflictDoUpdate({ target: personas.id, set: row as never });
}

export async function deleteLocalPersona(userId: number, id: string) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .delete(personas)
    .where(and(eq(personas.id, id), eq(personas.userId, userId)));
}

export async function upsertLocalLorebook(
  userId: number,
  row: LocalRowInput & { id: string },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .insert(lorebooks)
    .values(({ ...row, userId } as never))
    .onConflictDoUpdate({ target: lorebooks.id, set: row as never });
}

export async function deleteLocalLorebook(userId: number, id: string) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .delete(lorebooks)
    .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)));
}

export async function upsertLocalPreset(
  userId: number,
  row: LocalRowInput & { id: string },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .insert(samplingPresets)
    .values(({ ...row, userId } as never))
    .onConflictDoUpdate({ target: samplingPresets.id, set: row as never });
}

export async function deleteLocalPreset(userId: number, id: string) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .delete(samplingPresets)
    .where(and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)));
}

export async function upsertLocalCard(
  userId: number,
  row: LocalRowInput & { id: string },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .insert(cards)
    .values(({ ...row, userId } as never))
    .onConflictDoUpdate({ target: cards.id, set: row as never });
}

export async function deleteLocalCard(userId: number, id: string) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .delete(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)));
}

export async function upsertLocalConversation(
  userId: number,
  row: LocalRowInput & { id: string },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .insert(conversations)
    .values(({ ...row, userId } as never))
    .onConflictDoUpdate({ target: conversations.id, set: row as never });
}

export async function deleteLocalConversation(userId: number, id: string) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
}

export async function upsertLocalGenerationSession(
  userId: number,
  row: LocalRowInput & { id: string },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .insert(generationSessions)
    .values(({ ...row, userId } as never))
    .onConflictDoUpdate({ target: generationSessions.id, set: row as never });
}

export async function deleteLocalGenerationSession(
  userId: number,
  id: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db
    .delete(generationSessions)
    .where(
      and(eq(generationSessions.id, id), eq(generationSessions.userId, userId)),
    );
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
// Bundle writers - parent + cascade children in one transaction. Used by
// SyncStateHydrator stage 2 to apply server bundles atomically.
// ---------------------------------------------------------------------------

type AnyRow = Record<string, unknown> & { id: string };

export async function upsertLocalLorebookBundle(
  userId: number,
  bundle: { lorebook: AnyRow; entries: AnyRow[] },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  // No `local.transaction(...)` wrapper: SQLocal opens a real SQLite
  // transaction and holds the worker's transactionMutex, but `local.db.<x>`
  // queries (drizzle sqlite-proxy) don't carry the SQLocal transactionKey,
  // so they wait on that same mutex and deadlock. Cascade order is enough
  // here because bundle writes are idempotent upserts.
  await local.db
    .insert(lorebooks)
    .values({ ...bundle.lorebook, userId } as never)
    .onConflictDoUpdate({
      target: lorebooks.id,
      set: bundle.lorebook as never,
    });
  await local.db
    .delete(lorebookEntries)
    .where(eq(lorebookEntries.lorebookId, bundle.lorebook.id));
  for (const entry of bundle.entries) {
    await local.db
      .insert(lorebookEntries)
      .values(entry as never)
      .onConflictDoUpdate({ target: lorebookEntries.id, set: entry as never });
  }
}

export async function upsertLocalCardBundle(
  userId: number,
  bundle: {
    card: AnyRow;
    cardCharacters: Array<{ cardId: string; characterId: string; orderIndex?: number }>;
    cardLorebooks: Array<{ cardId: string; lorebookId: string; orderIndex?: number }>;
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  // No `local.transaction(...)` wrapper - see upsertLocalLorebookBundle.
  await local.db
    .insert(cards)
    .values({ ...bundle.card, userId } as never)
    .onConflictDoUpdate({ target: cards.id, set: bundle.card as never });
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
    settings: AnyRow | null;
    conversationCharacters: AnyRow[];
    conversationLorebooks: AnyRow[];
    messages: AnyRow[];
    messageItems: AnyRow[];
    media: AnyRow[];
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  // No `local.transaction(...)` wrapper - see upsertLocalLorebookBundle.
  await local.db
    .insert(conversations)
    .values({ ...bundle.conversation, userId } as never)
    .onConflictDoUpdate({
      target: conversations.id,
      set: bundle.conversation as never,
    });

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

  await local.db
    .delete(media)
    .where(eq(media.convId, bundle.conversation.id));
  for (const m of bundle.media) {
    await local.db.insert(media).values(m as never);
  }
}

export async function upsertLocalGenerationSessionBundle(
  userId: number,
  bundle: {
    session: AnyRow;
    generations: AnyRow[];
    generationImages: AnyRow[];
    generationLikes: AnyRow[];
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  // No `local.transaction(...)` wrapper - see upsertLocalLorebookBundle.
  await local.db
    .insert(generationSessions)
    .values({ ...bundle.session, userId } as never)
    .onConflictDoUpdate({
      target: generationSessions.id,
      set: bundle.session as never,
    });

  await local.db
    .delete(generations)
    .where(eq(generations.sessionId, bundle.session.id));
  for (const g of bundle.generations) {
    await local.db.insert(generations).values(g as never);
  }

  for (const img of bundle.generationImages) {
    await local.db.insert(generationImages).values(img as never);
  }

  for (const l of bundle.generationLikes) {
    await local.db.insert(generationLikes).values(l as never);
  }
}
