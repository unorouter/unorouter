import type { UserTheme } from "@/components/ui/theme/theme-store";
import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import { mediaKey, uploadToR2 } from "@/lib/config/r2";
import { uid } from "@/lib/utils/base";
import {
  characterBody,
  lorebookBody,
  lorebookEntryBody,
  personaBody,
  samplingPresetBody,
  type CharacterBody,
  type LorebookBody,
  type PersonaBody,
  type SamplingPresetBody,
} from "@/lib/validation/rp";
import { Value } from "@sinclair/typebox/value";
import type { SyncKindName } from "@/lib/validation/sync";
import {
  cardCharacters,
  cardLorebooks,
  cards,
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversations,
  conversationSettings,
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
import { addDays } from "@/lib/utils/format/date";
import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";

export type SyncBundleMap = {
  characters: { character: typeof characters.$inferSelect };
  personas: { persona: typeof personas.$inferSelect };
  lorebooks: {
    lorebook: typeof lorebooks.$inferSelect;
    entries: (typeof lorebookEntries.$inferSelect)[];
  };
  presets: { preset: typeof samplingPresets.$inferSelect };
  cards: {
    card: typeof cards.$inferSelect;
    cardCharacters: (typeof cardCharacters.$inferSelect)[];
    cardLorebooks: (typeof cardLorebooks.$inferSelect)[];
  };
  conversations: {
    conversation: typeof conversations.$inferSelect;
    settings: typeof conversationSettings.$inferSelect | null;
    conversationCharacters: (typeof conversationCharacters.$inferSelect)[];
    conversationLorebooks: (typeof conversationLorebooks.$inferSelect)[];
    messages: (typeof messages.$inferSelect)[];
    messageItems: (typeof messageItems.$inferSelect)[];
    media: (typeof media.$inferSelect)[];
  };
  playgroundSessions: {
    session: typeof playgroundSessions.$inferSelect;
    playgrounds: (typeof playgrounds.$inferSelect)[];
    media: (typeof media.$inferSelect)[];
  };
  theme: { theme: typeof userThemes.$inferSelect };
};

export type SyncBundle<K extends SyncKindName = SyncKindName> =
  SyncBundleMap[K];

// Default sync window when a request omits `days`.
const DEFAULT_TTL_DAYS = 30;

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

export async function getSyncedBundle(
  userId: number,
  kind: SyncKindName,
  id: string,
) {
  const db = getDb();
  switch (kind) {
    case "characters": {
      const rows = await db
        .select()
        .from(characters)
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .limit(1);
      assertFound(rows);
      return { character: rows[0] };
    }
    case "personas": {
      const rows = await db
        .select()
        .from(personas)
        .where(and(eq(personas.id, id), eq(personas.userId, userId)))
        .limit(1);
      assertFound(rows);
      return { persona: rows[0] };
    }
    case "lorebooks": {
      const rows = await db
        .select()
        .from(lorebooks)
        .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)))
        .limit(1);
      assertFound(rows);
      const entries = await db
        .select()
        .from(lorebookEntries)
        .where(eq(lorebookEntries.lorebookId, id));
      return { lorebook: rows[0], entries };
    }
    case "presets": {
      const rows = await db
        .select()
        .from(samplingPresets)
        .where(
          and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)),
        )
        .limit(1);
      assertFound(rows);
      return { preset: rows[0] };
    }
    case "cards": {
      const rows = await db
        .select()
        .from(cards)
        .where(and(eq(cards.id, id), eq(cards.userId, userId)))
        .limit(1);
      assertFound(rows);
      const [chars, lbs] = await Promise.all([
        db.select().from(cardCharacters).where(eq(cardCharacters.cardId, id)),
        db.select().from(cardLorebooks).where(eq(cardLorebooks.cardId, id)),
      ]);
      return { card: rows[0], cardCharacters: chars, cardLorebooks: lbs };
    }
    case "conversations": {
      const rows = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .limit(1);
      assertFound(rows);
      const [settingsRows, convCharsRows, convLbsRows, msgsRows, mediaRows] =
        await Promise.all([
          db
            .select()
            .from(conversationSettings)
            .where(eq(conversationSettings.convId, id)),
          db
            .select()
            .from(conversationCharacters)
            .where(eq(conversationCharacters.convId, id)),
          db
            .select()
            .from(conversationLorebooks)
            .where(eq(conversationLorebooks.convId, id)),
          db.select().from(messages).where(eq(messages.convId, id)),
          db.select().from(media).where(eq(media.convId, id)),
        ]);
      const msgIds = msgsRows.map((m) => m.id);
      const items = msgIds.length
        ? await db
            .select()
            .from(messageItems)
            .where(inArray(messageItems.messageId, msgIds))
        : [];
      return {
        conversation: rows[0],
        settings: settingsRows[0] ?? null,
        conversationCharacters: convCharsRows,
        conversationLorebooks: convLbsRows,
        messages: msgsRows,
        messageItems: items,
        media: mediaRows,
      };
    }
    case "playgroundSessions": {
      const rows = await db
        .select()
        .from(playgroundSessions)
        .where(
          and(
            eq(playgroundSessions.id, id),
            eq(playgroundSessions.userId, userId),
          ),
        )
        .limit(1);
      assertFound(rows);
      const gens = await db
        .select()
        .from(playgrounds)
        .where(eq(playgrounds.sessionId, id));
      const genIds = gens.map((g) => g.id);
      const mediaRows = genIds.length
        ? await db
            .select()
            .from(media)
            .where(inArray(media.playgroundId, genIds))
        : [];
      return {
        session: rows[0],
        playgrounds: gens,
        media: mediaRows,
      };
    }
    case "theme": {
      // userThemes is keyed by userId; route-level :id ignored.
      const rows = await db
        .select()
        .from(userThemes)
        .where(eq(userThemes.userId, userId))
        .limit(1);
      assertFound(rows);
      return { theme: rows[0] };
    }
  }
}

export type SyncRequestPayload = {
  days?: number;
  // Required for first sync or re-add after expiry. For resync of an extant
  // row, payload still wins (client is authoritative for any drift).
  payload?: unknown;
  // Mirror PATCH on save: keep existing expiry, refresh content only.
  keepExpiry?: boolean;
};

export async function setSyncExpiry(
  userId: number,
  kind: SyncKindName,
  id: string,
  req: SyncRequestPayload,
) {
  const db = getDb();
  let expiresAt = addDays(req.days ?? DEFAULT_TTL_DAYS);
  if (req.keepExpiry) {
    const existing = await readExistingSyncExpiry(db, userId, kind, id);
    if (existing) expiresAt = existing;
  }
  const handler = upsertHandlers[kind];
  await handler(db, userId, id, expiresAt, req.payload);
  return getSyncedBundle(userId, kind, id);
}

async function readExistingSyncExpiry(
  db: ReturnType<typeof getDb>,
  userId: number,
  kind: SyncKindName,
  id: string,
): Promise<Date | null> {
  switch (kind) {
    case "characters": {
      const rows = await db
        .select({ syncExpiresAt: characters.syncExpiresAt })
        .from(characters)
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .limit(1);
      return rows[0]?.syncExpiresAt ?? null;
    }
    case "personas": {
      const rows = await db
        .select({ syncExpiresAt: personas.syncExpiresAt })
        .from(personas)
        .where(and(eq(personas.id, id), eq(personas.userId, userId)))
        .limit(1);
      return rows[0]?.syncExpiresAt ?? null;
    }
    case "lorebooks": {
      const rows = await db
        .select({ syncExpiresAt: lorebooks.syncExpiresAt })
        .from(lorebooks)
        .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)))
        .limit(1);
      return rows[0]?.syncExpiresAt ?? null;
    }
    case "presets": {
      const rows = await db
        .select({ syncExpiresAt: samplingPresets.syncExpiresAt })
        .from(samplingPresets)
        .where(
          and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)),
        )
        .limit(1);
      return rows[0]?.syncExpiresAt ?? null;
    }
    case "cards": {
      const rows = await db
        .select({ syncExpiresAt: cards.syncExpiresAt })
        .from(cards)
        .where(and(eq(cards.id, id), eq(cards.userId, userId)))
        .limit(1);
      return rows[0]?.syncExpiresAt ?? null;
    }
    case "conversations": {
      const rows = await db
        .select({ syncExpiresAt: conversations.syncExpiresAt })
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .limit(1);
      return rows[0]?.syncExpiresAt ?? null;
    }
    case "playgroundSessions": {
      const rows = await db
        .select({ syncExpiresAt: playgroundSessions.syncExpiresAt })
        .from(playgroundSessions)
        .where(
          and(
            eq(playgroundSessions.id, id),
            eq(playgroundSessions.userId, userId),
          ),
        )
        .limit(1);
      return rows[0]?.syncExpiresAt ?? null;
    }
    case "theme": {
      const rows = await db
        .select({ syncExpiresAt: userThemes.syncExpiresAt })
        .from(userThemes)
        .where(eq(userThemes.userId, userId))
        .limit(1);
      return rows[0]?.syncExpiresAt ?? null;
    }
  }
}

type UpsertHandler = (
  db: ReturnType<typeof getDb>,
  userId: number,
  id: string,
  expiresAt: Date,
  payload: unknown,
) => Promise<void>;

// Transaction handle passed to the per-entity upsert helpers below.
type SyncTx = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

// --- Insert-value builders -------------------------------------------------
// Map a loose sync payload (unknown at the boundary) to a typed insert row.
// `Value.Cast` validates against the shared RP schema, coerces, fills defaults
// and drops extras (id/userId/timestamps) in one step, so the builders touch
// typed fields with no per-property casts. Shared by the standalone entity
// handlers and the conversation-bundle helpers below.

function characterInsertValues(
  body: unknown,
  userId: number,
  id: string,
  expiresAt: Date,
): typeof characters.$inferInsert {
  const v = Value.Cast(characterBody, body);
  return { ...v, id, userId, syncExpiresAt: expiresAt };
}

function personaInsertValues(
  body: unknown,
  userId: number,
  id: string,
  expiresAt: Date,
): typeof personas.$inferInsert {
  const v = Value.Cast(personaBody, body);
  return {
    ...v,
    id,
    userId,
    isDefault: v.isDefault ?? false,
    syncExpiresAt: expiresAt,
  };
}

function presetInsertValues(
  body: unknown,
  userId: number,
  id: string,
  expiresAt: Date,
): typeof samplingPresets.$inferInsert {
  const v = Value.Cast(samplingPresetBody, body);
  return {
    ...v,
    id,
    userId,
    isDefault: v.isDefault ?? false,
    syncExpiresAt: expiresAt,
  };
}

function lorebookInsertValues(
  lb: unknown,
  userId: number,
  id: string,
  expiresAt: Date,
): typeof lorebooks.$inferInsert {
  const v = Value.Cast(lorebookBody, lb);
  return { ...v, id, userId, syncExpiresAt: expiresAt };
}

function lorebookEntryInsertValues(
  e: unknown,
  lorebookId: string,
): typeof lorebookEntries.$inferInsert {
  const v = Value.Cast(lorebookEntryBody, e);
  const id = (e as { id?: unknown }).id;
  return {
    ...v,
    id: typeof id === "string" ? id : crypto.randomUUID(),
    lorebookId,
  };
}

// --- Referenced-entity upserts (used by the conversations bundle) ----------
// A conversation sync push carries the full bodies of every RP entity it
// binds. These insert each one (if absent) inside the conversation's
// transaction, before the conversation_* rows, so their foreign keys resolve
// even when the entity was never synced on its own. Bound entities inherit the
// conversation's `expiresAt`. Insert-only: an already-synced entity keeps its
// own row untouched.

async function rowExists(
  tx: SyncTx,
  table: typeof characters | typeof personas | typeof samplingPresets,
  id: string,
  userId: number,
): Promise<boolean> {
  const rows = await tx
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

async function insertReferencedCharacter(
  tx: SyncTx,
  userId: number,
  expiresAt: Date,
  body: Record<string, unknown>,
): Promise<void> {
  const id = body.id as string;
  if (!id || (await rowExists(tx, characters, id, userId))) return;
  await tx
    .insert(characters)
    .values(characterInsertValues(body, userId, id, expiresAt));
}

async function insertReferencedPersona(
  tx: SyncTx,
  userId: number,
  expiresAt: Date,
  body: Record<string, unknown>,
): Promise<void> {
  const id = body.id as string;
  if (!id || (await rowExists(tx, personas, id, userId))) return;
  await tx
    .insert(personas)
    .values(personaInsertValues(body, userId, id, expiresAt));
}

async function insertReferencedPreset(
  tx: SyncTx,
  userId: number,
  expiresAt: Date,
  body: Record<string, unknown>,
): Promise<void> {
  const id = body.id as string;
  if (!id || (await rowExists(tx, samplingPresets, id, userId))) return;
  await tx
    .insert(samplingPresets)
    .values(presetInsertValues(body, userId, id, expiresAt));
}

async function insertReferencedLorebook(
  tx: SyncTx,
  userId: number,
  expiresAt: Date,
  entry: { lorebook?: Record<string, unknown>; entries?: unknown[] },
): Promise<void> {
  const lb = entry.lorebook ?? {};
  const id = lb.id as string;
  if (!id) return;
  const rows = await tx
    .select({ id: lorebooks.id })
    .from(lorebooks)
    .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)))
    .limit(1);
  if (rows.length > 0) return;
  await tx
    .insert(lorebooks)
    .values(lorebookInsertValues(lb, userId, id, expiresAt));
  for (const e of (entry.entries ?? []) as Array<Record<string, unknown>>) {
    await tx.insert(lorebookEntries).values(lorebookEntryInsertValues(e, id));
  }
}

const upsertHandlers: Record<SyncKindName, UpsertHandler> = {
  characters: async (db, userId, id, expiresAt, payload) => {
    const body = (payload ?? {}) as Partial<CharacterBody>;
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: characters.id })
        .from(characters)
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .limit(1);
      if (existing.length === 0) {
        await tx
          .insert(characters)
          .values(characterInsertValues(body, userId, id, expiresAt));
      } else {
        await tx
          .update(characters)
          .set({
            ...stripUndefined({
              name: body.name,
              avatarMediaId: body.avatarMediaId,
              description: body.description,
              personality: body.personality,
              scenario: body.scenario,
              firstMessage: body.firstMessage,
              exampleMessages: body.exampleMessages,
              systemPrompt: body.systemPrompt,
              postHistoryInstructions: body.postHistoryInstructions,
              defaultReasoningEffort: body.defaultReasoningEffort,
              tags: body.tags,
              triggers: body.triggers,
              alwaysActive: body.alwaysActive,
              matchWholeWords: body.matchWholeWords,
            }),
            syncExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(and(eq(characters.id, id), eq(characters.userId, userId)));
      }
    });
  },

  personas: async (db, userId, id, expiresAt, payload) => {
    const body = (payload ?? {}) as Partial<PersonaBody>;
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: personas.id })
        .from(personas)
        .where(and(eq(personas.id, id), eq(personas.userId, userId)))
        .limit(1);
      if (existing.length === 0) {
        await tx
          .insert(personas)
          .values(personaInsertValues(body, userId, id, expiresAt));
      } else {
        await tx
          .update(personas)
          .set({
            ...stripUndefined({
              name: body.name,
              description: body.description,
              avatarMediaId: body.avatarMediaId,
              isDefault: body.isDefault,
            }),
            syncExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(and(eq(personas.id, id), eq(personas.userId, userId)));
      }
    });
  },

  lorebooks: async (db, userId, id, expiresAt, payload) => {
    const body = (payload ?? {}) as {
      lorebook?: Partial<LorebookBody>;
      entries?: unknown[];
    };
    const lb = body.lorebook ?? {};
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: lorebooks.id })
        .from(lorebooks)
        .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)))
        .limit(1);
      if (existing.length === 0) {
        await tx
          .insert(lorebooks)
          .values(lorebookInsertValues(lb, userId, id, expiresAt));
      } else {
        await tx
          .update(lorebooks)
          .set({
            ...stripUndefined({
              name: lb.name,
              description: lb.description,
              scanDepth: lb.scanDepth,
              tokenBudget: lb.tokenBudget,
              recursiveScanning: lb.recursiveScanning,
            }),
            syncExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)));
      }
      if (body.entries) {
        await tx
          .delete(lorebookEntries)
          .where(eq(lorebookEntries.lorebookId, id));
        for (const e of body.entries) {
          await tx
            .insert(lorebookEntries)
            .values(lorebookEntryInsertValues(e, id));
        }
      }
    });
  },

  presets: async (db, userId, id, expiresAt, payload) => {
    const body = (payload ?? {}) as Partial<SamplingPresetBody>;
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: samplingPresets.id })
        .from(samplingPresets)
        .where(
          and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)),
        )
        .limit(1);
      if (existing.length === 0) {
        await tx
          .insert(samplingPresets)
          .values(presetInsertValues(body, userId, id, expiresAt));
      } else {
        await tx
          .update(samplingPresets)
          .set({
            ...stripUndefined({
              name: body.name,
              temperature: body.temperature,
              topP: body.topP,
              topK: body.topK,
              minP: body.minP,
              topA: body.topA,
              frequencyPenalty: body.frequencyPenalty,
              presencePenalty: body.presencePenalty,
              repetitionPenalty: body.repetitionPenalty,
              maxTokens: body.maxTokens,
              extraBody: body.extraBody,
              mainPrompt: body.mainPrompt,
              postHistory: body.postHistory,
              prefill: body.prefill,
              forceAlternateRoles: body.forceAlternateRoles,
              noSystemRole: body.noSystemRole,
              mustStartWithUserInput: body.mustStartWithUserInput,
              skipPrefillIfLastIsAssistant: body.skipPrefillIfLastIsAssistant,
              geminiBlockOff: body.geminiBlockOff,
              isDefault: body.isDefault,
            }),
            syncExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(
            and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)),
          );
      }
    });
  },

  cards: async (db, userId, id, expiresAt, payload) => {
    const body = (payload ?? {}) as {
      card?: Record<string, unknown>;
      cardCharacters?: Array<{ characterId: string; orderIndex?: number }>;
      cardLorebooks?: Array<{ lorebookId: string; orderIndex?: number }>;
    };
    const c = body.card ?? {};
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: cards.id })
        .from(cards)
        .where(and(eq(cards.id, id), eq(cards.userId, userId)))
        .limit(1);
      if (existing.length === 0) {
        await tx.insert(cards).values({
          id,
          userId,
          name: (c.name as string) ?? "Untitled",
          description: (c.description as string | null) ?? null,
          personaId: (c.personaId as string | null) ?? null,
          syncExpiresAt: expiresAt,
        });
      } else {
        await tx
          .update(cards)
          .set({
            ...stripUndefined({
              name: c.name as string | undefined,
              description: c.description as string | null | undefined,
              personaId: c.personaId as string | null | undefined,
            }),
            syncExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(and(eq(cards.id, id), eq(cards.userId, userId)));
      }
      if (body.cardCharacters) {
        await tx.delete(cardCharacters).where(eq(cardCharacters.cardId, id));
        for (let i = 0; i < body.cardCharacters.length; i++) {
          const row = body.cardCharacters[i];
          await tx.insert(cardCharacters).values({
            cardId: id,
            characterId: row.characterId,
            orderIndex: row.orderIndex ?? i,
          });
        }
      }
      if (body.cardLorebooks) {
        await tx.delete(cardLorebooks).where(eq(cardLorebooks.cardId, id));
        for (let i = 0; i < body.cardLorebooks.length; i++) {
          const row = body.cardLorebooks[i];
          await tx.insert(cardLorebooks).values({
            cardId: id,
            lorebookId: row.lorebookId,
            orderIndex: row.orderIndex ?? i,
          });
        }
      }
    });
  },

  conversations: async (db, userId, id, expiresAt, payload) => {
    const body = (payload ?? {}) as {
      conversation?: Record<string, unknown>;
      settings?: Record<string, unknown> | null;
      conversationCharacters?: Array<Record<string, unknown>>;
      conversationLorebooks?: Array<Record<string, unknown>>;
      messages?: Array<Record<string, unknown>>;
      messageItems?: Array<Record<string, unknown>>;
      media?: Array<Record<string, unknown>>;
      // Full bodies of every RP entity this conversation binds. Upserted first
      // so the conversation_* foreign keys resolve (self-contained sync).
      characters?: Array<Record<string, unknown>>;
      personas?: Array<Record<string, unknown>>;
      lorebooks?: Array<{
        lorebook?: Record<string, unknown>;
        entries?: unknown[];
      }>;
      presets?: Array<Record<string, unknown>>;
    };
    const c = body.conversation ?? {};
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .limit(1);
      if (existing.length === 0) {
        await tx.insert(conversations).values({
          id,
          userId,
          title: (c.title as string | null) ?? null,
          totalInputTokens: (c.totalInputTokens as number | undefined) ?? 0,
          totalOutputTokens: (c.totalOutputTokens as number | undefined) ?? 0,
          totalCost: (c.totalCost as number | undefined) ?? 0,
          syncExpiresAt: expiresAt,
        });
      } else {
        await tx
          .update(conversations)
          .set({
            ...stripUndefined({
              title: c.title as string | null | undefined,
              totalInputTokens: c.totalInputTokens as number | undefined,
              totalOutputTokens: c.totalOutputTokens as number | undefined,
              totalCost: c.totalCost as number | undefined,
            }),
            syncExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(
            and(eq(conversations.id, id), eq(conversations.userId, userId)),
          );
      }

      // Upsert referenced RP entities before any conversation_* rows so their
      // foreign keys (conversation_characters.character_id, etc.) resolve.
      for (const ch of body.characters ?? []) {
        await insertReferencedCharacter(tx, userId, expiresAt, ch);
      }
      for (const p of body.personas ?? []) {
        await insertReferencedPersona(tx, userId, expiresAt, p);
      }
      for (const lb of body.lorebooks ?? []) {
        await insertReferencedLorebook(tx, userId, expiresAt, lb);
      }
      for (const pr of body.presets ?? []) {
        await insertReferencedPreset(tx, userId, expiresAt, pr);
      }

      if (body.settings !== undefined) {
        await tx
          .delete(conversationSettings)
          .where(eq(conversationSettings.convId, id));
        if (body.settings) {
          const s = body.settings;
          await tx.insert(conversationSettings).values({
            convId: id,
            defaultModel: (s.defaultModel as string) ?? "",
            personaId: (s.personaId as string | null) ?? null,
            presetId: (s.presetId as string | null) ?? null,
            systemPromptOverride:
              (s.systemPromptOverride as string | null) ?? null,
            authorNote: (s.authorNote as string | null) ?? null,
            authorNoteDepth: (s.authorNoteDepth as number | undefined) ?? 4,
            chatMemory: (s.chatMemory as number | undefined) ?? 8,
            reasoningEffort: (s.reasoningEffort as string | null) ?? null,
            webSearchEnabled:
              (s.webSearchEnabled as boolean | undefined) ?? false,
            webSearchEngine:
              (s.webSearchEngine as string | undefined) ?? "auto",
            webSearchContextSize:
              (s.webSearchContextSize as string | undefined) ?? "medium",
            temperature: (s.temperature as number | null) ?? null,
            topP: (s.topP as number | null) ?? null,
            topK: (s.topK as number | null) ?? null,
            minP: (s.minP as number | null) ?? null,
            topA: (s.topA as number | null) ?? null,
            frequencyPenalty: (s.frequencyPenalty as number | null) ?? null,
            presencePenalty: (s.presencePenalty as number | null) ?? null,
            repetitionPenalty: (s.repetitionPenalty as number | null) ?? null,
            maxTokens: (s.maxTokens as number | null) ?? null,
            extraBody: (s.extraBody as string | null) ?? null,
            streamingEnabled:
              (s.streamingEnabled as boolean | undefined) ?? true,
          });
        }
      }

      if (body.conversationCharacters) {
        await tx
          .delete(conversationCharacters)
          .where(eq(conversationCharacters.convId, id));
        for (const row of body.conversationCharacters) {
          // `overrides` is a nullable json column. Passing an explicit `null`
          // makes the libSQL driver miscount bind params; `undefined` lets
          // Drizzle omit the column so it falls back to SQL NULL.
          await tx.insert(conversationCharacters).values({
            convId: id,
            characterId: row.characterId as string,
            orderIndex: (row.orderIndex as number | undefined) ?? 0,
            isActive: (row.isActive as boolean | undefined) ?? true,
            overrides: (row.overrides as unknown) ?? undefined,
          });
        }
      }

      if (body.conversationLorebooks) {
        await tx
          .delete(conversationLorebooks)
          .where(eq(conversationLorebooks.convId, id));
        for (const row of body.conversationLorebooks) {
          await tx.insert(conversationLorebooks).values({
            convId: id,
            lorebookId: row.lorebookId as string,
            orderIndex: (row.orderIndex as number | undefined) ?? 0,
          });
        }
      }

      if (body.messages) {
        await tx.delete(messages).where(eq(messages.convId, id));
        for (const m of body.messages) {
          await tx.insert(messages).values({
            id: m.id as string,
            convId: id,
            parentId: (m.parentId as string | null) ?? null,
            characterId: (m.characterId as string | null) ?? null,
            role: m.role as string,
            model: (m.model as string | null) ?? null,
            playgroundId: (m.playgroundId as string | null) ?? null,
            inputTokens: (m.inputTokens as number | null) ?? null,
            outputTokens: (m.outputTokens as number | null) ?? null,
            cost: (m.cost as number | null) ?? null,
            durationMs: (m.durationMs as number | null) ?? null,
            tokensPerSecond: (m.tokensPerSecond as number | null) ?? null,
            branchIndex: (m.branchIndex as number | undefined) ?? 0,
            isActiveBranch: (m.isActiveBranch as boolean | undefined) ?? true,
            isEdited: (m.isEdited as boolean | undefined) ?? false,
          });
        }
      }

      if (body.messageItems) {
        for (const it of body.messageItems) {
          await tx.insert(messageItems).values({
            id: it.id as string,
            messageId: it.messageId as string,
            sequenceIndex: it.sequenceIndex as number,
            outputIndex: (it.outputIndex as number | null) ?? null,
            type: it.type as string,
            data: it.data as unknown,
          });
        }
      }

      if (body.media) {
        await tx.delete(media).where(eq(media.convId, id));
        for (const m of body.media) {
          const incomingBase64 = m.dataBase64 as string | null | undefined;
          let r2Key = (m.r2Key as string | null | undefined) ?? null;
          let r2Url = (m.r2Url as string | null | undefined) ?? null;

          // Local-only blob: upload to R2 so Turso stays pointer-only.
          if (!r2Key && incomingBase64) {
            const buffer = Buffer.from(incomingBase64, "base64");
            r2Key = mediaKey("user", id, m.id as string, uid(8));
            const uploaded = await uploadToR2(
              r2Key,
              buffer,
              m.mimeType as string,
            );
            r2Url = uploaded.url;
          }

          await tx.insert(media).values({
            id: m.id as string,
            userId,
            convId: id,
            r2Key,
            r2Url,
            dataBase64: null,
            mimeType: m.mimeType as string,
            sizeBytes: m.sizeBytes as number,
            extractedText: (m.extractedText as string | null) ?? null,
          });
        }
      }
    });
  },

  playgroundSessions: async (db, userId, id, expiresAt, payload) => {
    const body = (payload ?? {}) as {
      session?: Record<string, unknown>;
      playgrounds?: Array<Record<string, unknown>>;
      media?: Array<Record<string, unknown>>;
    };
    const s = body.session ?? {};
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: playgroundSessions.id })
        .from(playgroundSessions)
        .where(
          and(
            eq(playgroundSessions.id, id),
            eq(playgroundSessions.userId, userId),
          ),
        )
        .limit(1);
      const fallbackExpires = (s.expiresAt as Date | undefined) ?? expiresAt;
      if (existing.length === 0) {
        await tx.insert(playgroundSessions).values({
          id,
          userId,
          title: (s.title as string | null) ?? null,
          firstModel: (s.firstModel as string | null) ?? null,
          snapshotCount: (s.snapshotCount as number | undefined) ?? 0,
          imageCount: (s.imageCount as number | undefined) ?? 0,
          expiresAt: fallbackExpires,
          syncExpiresAt: expiresAt,
        });
      } else {
        await tx
          .update(playgroundSessions)
          .set({
            ...stripUndefined({
              title: s.title as string | null | undefined,
              firstModel: s.firstModel as string | null | undefined,
              snapshotCount: s.snapshotCount as number | undefined,
              imageCount: s.imageCount as number | undefined,
              expiresAt: s.expiresAt as Date | undefined,
            }),
            syncExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(playgroundSessions.id, id),
              eq(playgroundSessions.userId, userId),
            ),
          );
      }
      if (body.playgrounds) {
        await tx.delete(playgrounds).where(eq(playgrounds.sessionId, id));
        for (const g of body.playgrounds) {
          await tx.insert(playgrounds).values({
            id: g.id as string,
            userId,
            sessionId: id,
            sessionOrder: g.sessionOrder as number,
            requestedCount: (g.requestedCount as number | undefined) ?? 1,
            taskId: (g.taskId as string | null) ?? null,
            model: g.model as string,
            prompt: g.prompt as string,
            negativePrompt: (g.negativePrompt as string | null) ?? null,
            params: (g.params as unknown) ?? null,
            loras: (g.loras as unknown) ?? null,
            references: (g.references as unknown) ?? null,
            extraParams: (g.extraParams as unknown) ?? null,
            status: (g.status as string | undefined) ?? "pending",
            progress: (g.progress as string | null) ?? null,
            costQuota: (g.costQuota as number | null) ?? null,
            visibility: (g.visibility as string | undefined) ?? "private",
            flagged: (g.flagged as boolean | undefined) ?? false,
            flagReason: (g.flagReason as string | null) ?? null,
            remixCount: (g.remixCount as number | undefined) ?? 0,
            likeCount: (g.likeCount as number | undefined) ?? 0,
            remixedFrom: (g.remixedFrom as string | null) ?? null,
            errorMessage: (g.errorMessage as string | null) ?? null,
            submittedKey: (g.submittedKey as string | null) ?? null,
            expiresAt: (g.expiresAt as Date | undefined) ?? fallbackExpires,
          });
        }
      }
      // Generation images live in `media` keyed by playgroundId. A local-only
      // image carries dataBase64, which uploads to R2 here so Turso stays
      // pointer-only.
      if (body.media) {
        for (const m of body.media) {
          const mediaId = m.id as string;
          const incomingBase64 = m.dataBase64 as string | null | undefined;
          let r2Key = (m.r2Key as string | null | undefined) ?? null;
          let r2Url = (m.r2Url as string | null | undefined) ?? null;
          if (!r2Key && incomingBase64) {
            const buffer = Buffer.from(incomingBase64, "base64");
            r2Key = mediaKey("user", id, mediaId, uid(8));
            const uploaded = await uploadToR2(
              r2Key,
              buffer,
              m.mimeType as string,
            );
            r2Url = uploaded.url;
          }
          await tx
            .delete(media)
            .where(and(eq(media.id, mediaId), eq(media.userId, userId)));
          await tx.insert(media).values({
            id: mediaId,
            userId,
            convId: null,
            playgroundId: (m.playgroundId as string | null) ?? null,
            sequenceIndex: (m.sequenceIndex as number | null) ?? null,
            upstreamResultUrl: (m.upstreamResultUrl as string | null) ?? null,
            r2Key,
            r2Url,
            dataBase64: null,
            mimeType: m.mimeType as string,
            sizeBytes: m.sizeBytes as number,
            width: (m.width as number | null) ?? null,
            height: (m.height as number | null) ?? null,
            extractedText: (m.extractedText as string | null) ?? null,
          });
        }
      }
    });
  },

  // Theme is single-row per user keyed by userId. Accepts either
  // `{ themeJson: ... }` or the raw theme JSON.
  theme: async (db, userId, _id, expiresAt, payload) => {
    const body = (payload ?? {}) as Record<string, unknown>;
    const themeJson = (body.themeJson ?? body) as UserTheme;
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ userId: userThemes.userId })
        .from(userThemes)
        .where(eq(userThemes.userId, userId))
        .limit(1);
      if (existing.length === 0) {
        await tx.insert(userThemes).values({
          userId,
          themeJson,
          syncExpiresAt: expiresAt,
        });
      } else {
        await tx
          .update(userThemes)
          .set({
            themeJson,
            syncExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(userThemes.userId, userId));
      }
    });
  },
};

export async function clearSyncExpiry(
  userId: number,
  kind: SyncKindName,
  id: string,
) {
  const db = getDb();
  let result: { id: string }[] = [];
  switch (kind) {
    case "characters":
      result = await db
        .delete(characters)
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .returning({ id: characters.id });
      break;
    case "personas":
      result = await db
        .delete(personas)
        .where(and(eq(personas.id, id), eq(personas.userId, userId)))
        .returning({ id: personas.id });
      break;
    case "lorebooks":
      result = await db
        .delete(lorebooks)
        .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)))
        .returning({ id: lorebooks.id });
      break;
    case "presets":
      result = await db
        .delete(samplingPresets)
        .where(
          and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)),
        )
        .returning({ id: samplingPresets.id });
      break;
    case "cards":
      result = await db
        .delete(cards)
        .where(and(eq(cards.id, id), eq(cards.userId, userId)))
        .returning({ id: cards.id });
      break;
    case "conversations":
      result = await db
        .delete(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .returning({ id: conversations.id });
      break;
    case "playgroundSessions":
      result = await db
        .delete(playgroundSessions)
        .where(
          and(
            eq(playgroundSessions.id, id),
            eq(playgroundSessions.userId, userId),
          ),
        )
        .returning({ id: playgroundSessions.id });
      break;
    case "theme":
      // `id` ignored; user_themes is keyed by userId.
      result = (
        await db
          .delete(userThemes)
          .where(eq(userThemes.userId, userId))
          .returning({ userId: userThemes.userId })
      ).map((r) => ({ id: String(r.userId) }));
      break;
  }
  assertFound(result);
  return { id };
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}
