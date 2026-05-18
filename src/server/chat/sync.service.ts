import { assertFound } from "@/lib/db/assertions";
import { getDb } from "@/lib/db/client";
import { mediaKey, uploadToR2 } from "@/lib/config/r2";
import { uid } from "@/lib/utils/base";
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
import dayjs from "dayjs";
import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Sync service: shared engine driving Add/Resync (idempotent POST /sync) and
// Remove sync (DELETE /sync) for every Group A entity. Server holds rows
// only while `syncExpiresAt > now()`; past that, sweepExpired hard-deletes
// them on the next request. Local SQLocal is never touched by this module.
// ---------------------------------------------------------------------------

export type SyncKind =
  | "characters"
  | "personas"
  | "lorebooks"
  | "presets"
  | "cards"
  | "conversations"
  | "generationSessions"
  | "theme";

const DEFAULT_TTL_DAYS = 30;

function expiryFromDays(days: number = DEFAULT_TTL_DAYS): Date {
  return dayjs().add(days, "day").toDate();
}

// Per-request memo so the route-level .derive() can call sweepExpired once
// per request without a second pass adding cost.
const sweptThisRequest = new WeakSet<object>();
export function sweepKey(): object {
  return {};
}

/**
 * Hard-delete every row in Group A whose sync window has elapsed. FK cascades
 * remove children. Idempotent; safe to call on every request.
 */
export async function sweepExpired(userId: number, key?: object) {
  if (key && sweptThisRequest.has(key)) return;
  if (key) sweptThisRequest.add(key);
  const db = getDb();
  const now = new Date();
  // v4 = IDB canonical. Expired sync windows hard-delete server rows;
  // FK cascade removes children. Local SQLocal copies untouched.
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
      .delete(generationSessions)
      .where(
        and(
          eq(generationSessions.userId, userId),
          isNotNull(generationSessions.syncExpiresAt),
          lt(generationSessions.syncExpiresAt, now),
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

// ---------------------------------------------------------------------------
// Bulk sync-state probe used by the client hydrator on every chat-page load.
// Returns minimal {id, syncExpiresAt, updatedAt} so the client can diff
// against local SQLocal and decide which bundles to pull.
// ---------------------------------------------------------------------------

type SyncStateRow = {
  id: string;
  syncExpiresAt: Date | null;
  updatedAt: Date;
};

export type SyncStateBulk = Record<SyncKind, SyncStateRow[]>;

export async function getSyncStateBulk(userId: number): Promise<SyncStateBulk> {
  const db = getDb();
  const [
    charactersRows,
    personasRows,
    lorebooksRows,
    presetsRows,
    cardsRows,
    conversationsRows,
    generationSessionsRows,
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
        id: generationSessions.id,
        syncExpiresAt: generationSessions.syncExpiresAt,
        updatedAt: generationSessions.updatedAt,
      })
      .from(generationSessions)
      .where(
        and(
          eq(generationSessions.userId, userId),
          isNotNull(generationSessions.syncExpiresAt),
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
    generationSessions: generationSessionsRows,
    theme: themeRows.map((r) => ({
      id: String(r.userId),
      syncExpiresAt: r.syncExpiresAt,
      updatedAt: r.updatedAt,
    })),
  };
}

// ---------------------------------------------------------------------------
// Bundle reader. Read time is the only time children are aggregated; nothing
// is denormalized server-side. Cascade children FK from parent.
// ---------------------------------------------------------------------------

export async function getSyncedBundle(
  userId: number,
  kind: SyncKind,
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
    case "generationSessions": {
      const rows = await db
        .select()
        .from(generationSessions)
        .where(
          and(
            eq(generationSessions.id, id),
            eq(generationSessions.userId, userId),
          ),
        )
        .limit(1);
      assertFound(rows);
      const gens = await db
        .select()
        .from(generations)
        .where(eq(generations.sessionId, id));
      const genIds = gens.map((g) => g.id);
      const [imgs, likes] = await Promise.all([
        genIds.length
          ? db
              .select()
              .from(generationImages)
              .where(inArray(generationImages.generationId, genIds))
          : Promise.resolve([]),
        genIds.length
          ? db
              .select()
              .from(generationLikes)
              .where(inArray(generationLikes.generationId, genIds))
          : Promise.resolve([]),
      ]);
      return {
        session: rows[0],
        generations: gens,
        generationImages: imgs,
        generationLikes: likes,
      };
    }
    case "theme": {
      // Theme has userId as PK; the route-level `:id` is ignored on read
      // because there is only one row per user. Returning the row directly.
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

// ---------------------------------------------------------------------------
// Add sync / Resync: single idempotent entry. Sets `syncExpiresAt = now+30d`.
// Upserts the full row payload (and known children) so a previously-expired
// row can be re-added without a separate `create` call from the client.
// Bundle payload shapes mirror what getSyncedBundle returns.
// ---------------------------------------------------------------------------

export type SyncRequestPayload = {
  days?: number;
  // The Group A entity body; shape depends on kind. Required when the row
  // does not yet exist server-side (re-add after expiry, or first-time sync
  // of a local-only row). For Resync of an extant row, payload still wins
  // (client is authoritative for any drift).
  payload?: unknown;
  // Mirror PATCH on save: keep existing expiry, refresh content only. If the
  // row doesn't exist yet we fall back to a fresh `now+30d` window because
  // an upsert without an expiry would be invisible to the mirror.
  keepExpiry?: boolean;
};

export async function setSyncExpiry(
  userId: number,
  kind: SyncKind,
  id: string,
  req: SyncRequestPayload,
) {
  const db = getDb();
  // If caller asked to preserve the existing window, read the current
  // `sync_expires_at` (if any) and reuse it. Otherwise compute a fresh one.
  let expiresAt = expiryFromDays(req.days);
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
  kind: SyncKind,
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
    case "generationSessions": {
      const rows = await db
        .select({ syncExpiresAt: generationSessions.syncExpiresAt })
        .from(generationSessions)
        .where(
          and(
            eq(generationSessions.id, id),
            eq(generationSessions.userId, userId),
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

// ---------------------------------------------------------------------------
// Per-kind upsert handlers. Each accepts the (already validated) payload and
// applies it inside one transaction together with the new syncExpiresAt.
// ---------------------------------------------------------------------------

type UpsertHandler = (
  db: ReturnType<typeof getDb>,
  userId: number,
  id: string,
  expiresAt: Date,
  payload: unknown,
) => Promise<void>;

const upsertHandlers: Record<SyncKind, UpsertHandler> = {
  characters: async (db, userId, id, expiresAt, payload) => {
    const body = (payload ?? {}) as Record<string, unknown>;
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: characters.id })
        .from(characters)
        .where(and(eq(characters.id, id), eq(characters.userId, userId)))
        .limit(1);
      if (existing.length === 0) {
        await tx.insert(characters).values({
          id,
          userId,
          name: (body.name as string) ?? "Untitled",
          avatarR2Key: (body.avatarR2Key as string | null) ?? null,
          description: (body.description as string | null) ?? null,
          personality: (body.personality as string | null) ?? null,
          scenario: (body.scenario as string | null) ?? null,
          firstMessage: (body.firstMessage as string | null) ?? null,
          exampleMessages: (body.exampleMessages as string | null) ?? null,
          systemPrompt: (body.systemPrompt as string | null) ?? null,
          postHistoryInstructions:
            (body.postHistoryInstructions as string | null) ?? null,
          defaultReasoningEffort:
            (body.defaultReasoningEffort as string | null) ?? null,
          tags: (body.tags as unknown) ?? null,
          nsfw: (body.nsfw as boolean | undefined) ?? false,
          triggers: (body.triggers as unknown) ?? null,
          alwaysActive: (body.alwaysActive as boolean | undefined) ?? true,
          matchWholeWords:
            (body.matchWholeWords as boolean | undefined) ?? false,
          syncExpiresAt: expiresAt,
        });
      } else {
        await tx
          .update(characters)
          .set({
            ...stripUndefined({
              name: body.name as string | undefined,
              avatarR2Key: body.avatarR2Key as string | null | undefined,
              description: body.description as string | null | undefined,
              personality: body.personality as string | null | undefined,
              scenario: body.scenario as string | null | undefined,
              firstMessage: body.firstMessage as string | null | undefined,
              exampleMessages: body.exampleMessages as
                | string
                | null
                | undefined,
              systemPrompt: body.systemPrompt as string | null | undefined,
              postHistoryInstructions: body.postHistoryInstructions as
                | string
                | null
                | undefined,
              defaultReasoningEffort: body.defaultReasoningEffort as
                | string
                | null
                | undefined,
              tags: body.tags as unknown,
              nsfw: body.nsfw as boolean | undefined,
              triggers: body.triggers as unknown,
              alwaysActive: body.alwaysActive as boolean | undefined,
              matchWholeWords: body.matchWholeWords as boolean | undefined,
            }),
            syncExpiresAt: expiresAt,
            updatedAt: new Date(),
          })
          .where(and(eq(characters.id, id), eq(characters.userId, userId)));
      }
    });
  },

  personas: async (db, userId, id, expiresAt, payload) => {
    const body = (payload ?? {}) as Record<string, unknown>;
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: personas.id })
        .from(personas)
        .where(and(eq(personas.id, id), eq(personas.userId, userId)))
        .limit(1);
      if (existing.length === 0) {
        await tx.insert(personas).values({
          id,
          userId,
          name: (body.name as string) ?? "Untitled",
          description: (body.description as string | null) ?? null,
          avatarR2Key: (body.avatarR2Key as string | null) ?? null,
          isDefault: (body.isDefault as boolean | undefined) ?? false,
          syncExpiresAt: expiresAt,
        });
      } else {
        await tx
          .update(personas)
          .set({
            ...stripUndefined({
              name: body.name as string | undefined,
              description: body.description as string | null | undefined,
              avatarR2Key: body.avatarR2Key as string | null | undefined,
              isDefault: body.isDefault as boolean | undefined,
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
      lorebook?: Record<string, unknown>;
      entries?: Array<Record<string, unknown>>;
    };
    const lb = body.lorebook ?? {};
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: lorebooks.id })
        .from(lorebooks)
        .where(and(eq(lorebooks.id, id), eq(lorebooks.userId, userId)))
        .limit(1);
      if (existing.length === 0) {
        await tx.insert(lorebooks).values({
          id,
          userId,
          name: (lb.name as string) ?? "Untitled",
          description: (lb.description as string | null) ?? null,
          scanDepth: (lb.scanDepth as number | undefined) ?? 4,
          tokenBudget: (lb.tokenBudget as number | undefined) ?? 1500,
          recursiveScanning:
            (lb.recursiveScanning as boolean | undefined) ?? false,
          syncExpiresAt: expiresAt,
        });
      } else {
        await tx
          .update(lorebooks)
          .set({
            ...stripUndefined({
              name: lb.name as string | undefined,
              description: lb.description as string | null | undefined,
              scanDepth: lb.scanDepth as number | undefined,
              tokenBudget: lb.tokenBudget as number | undefined,
              recursiveScanning: lb.recursiveScanning as boolean | undefined,
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
          await tx.insert(lorebookEntries).values({
            id: (e.id as string | undefined) ?? crypto.randomUUID(),
            lorebookId: id,
            keys: (e.keys as unknown) ?? [],
            secondaryKeys: (e.secondaryKeys as unknown) ?? null,
            content: (e.content as string) ?? "",
            constant: (e.constant as boolean | undefined) ?? false,
            selective: (e.selective as boolean | undefined) ?? false,
            priority: (e.priority as number | undefined) ?? 100,
            position: (e.position as string | undefined) ?? "before_char",
            depth: (e.depth as number | undefined) ?? 4,
            enabled: (e.enabled as boolean | undefined) ?? true,
            orderIndex: (e.orderIndex as number | undefined) ?? 0,
            matchWholeWords:
              (e.matchWholeWords as boolean | undefined) ?? false,
            injectionRole: (e.injectionRole as string | undefined) ?? "user",
          });
        }
      }
    });
  },

  presets: async (db, userId, id, expiresAt, payload) => {
    const body = (payload ?? {}) as Record<string, unknown>;
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: samplingPresets.id })
        .from(samplingPresets)
        .where(
          and(eq(samplingPresets.id, id), eq(samplingPresets.userId, userId)),
        )
        .limit(1);
      if (existing.length === 0) {
        await tx.insert(samplingPresets).values({
          id,
          userId,
          name: (body.name as string) ?? "Untitled",
          temperature: (body.temperature as number | null) ?? null,
          topP: (body.topP as number | null) ?? null,
          topK: (body.topK as number | null) ?? null,
          minP: (body.minP as number | null) ?? null,
          topA: (body.topA as number | null) ?? null,
          frequencyPenalty: (body.frequencyPenalty as number | null) ?? null,
          presencePenalty: (body.presencePenalty as number | null) ?? null,
          repetitionPenalty: (body.repetitionPenalty as number | null) ?? null,
          maxTokens: (body.maxTokens as number | null) ?? null,
          extraBody: (body.extraBody as string | null) ?? null,
          mainPrompt: (body.mainPrompt as string | null) ?? null,
          postHistory: (body.postHistory as string | null) ?? null,
          prefill: (body.prefill as string | null) ?? null,
          forceAlternateRoles:
            (body.forceAlternateRoles as boolean | undefined) ?? false,
          noSystemRole: (body.noSystemRole as boolean | undefined) ?? false,
          mustStartWithUserInput:
            (body.mustStartWithUserInput as boolean | undefined) ?? false,
          skipPrefillIfLastIsAssistant:
            (body.skipPrefillIfLastIsAssistant as boolean | undefined) ?? false,
          geminiBlockOff: (body.geminiBlockOff as boolean | undefined) ?? false,
          isDefault: (body.isDefault as boolean | undefined) ?? false,
          syncExpiresAt: expiresAt,
        });
      } else {
        await tx
          .update(samplingPresets)
          .set({
            ...body,
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
          await tx.insert(conversationCharacters).values({
            convId: id,
            characterId: row.characterId as string,
            orderIndex: (row.orderIndex as number | undefined) ?? 0,
            isActive: (row.isActive as boolean | undefined) ?? true,
            overrides: (row.overrides as unknown) ?? null,
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
            generationId: (m.generationId as string | null) ?? null,
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
        // messageItems FK cascades when their parent message is deleted, so
        // the per-message reset above already wiped them. Re-insert from
        // the client-supplied bundle.
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

          // If the client only has the blob locally (data_base64 set, no R2
          // key yet), upload it now. Turso never stores base64 - we want the
          // server-side row pointer-only so the DB stays small.
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
            // data_base64 stays null on Turso. Local clients keep their copy
            // and re-read it via bundle pulls if they wipe their OPFS, but
            // the server side is always pointer-only.
            dataBase64: null,
            mimeType: m.mimeType as string,
            sizeBytes: m.sizeBytes as number,
            extractedText: (m.extractedText as string | null) ?? null,
          });
        }
      }
    });
  },

  generationSessions: async (db, userId, id, expiresAt, payload) => {
    const body = (payload ?? {}) as {
      session?: Record<string, unknown>;
      generations?: Array<Record<string, unknown>>;
      generationImages?: Array<Record<string, unknown>>;
      generationLikes?: Array<Record<string, unknown>>;
    };
    const s = body.session ?? {};
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: generationSessions.id })
        .from(generationSessions)
        .where(
          and(
            eq(generationSessions.id, id),
            eq(generationSessions.userId, userId),
          ),
        )
        .limit(1);
      const fallbackExpires = (s.expiresAt as Date | undefined) ?? expiresAt;
      if (existing.length === 0) {
        await tx.insert(generationSessions).values({
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
          .update(generationSessions)
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
              eq(generationSessions.id, id),
              eq(generationSessions.userId, userId),
            ),
          );
      }
      if (body.generations) {
        await tx.delete(generations).where(eq(generations.sessionId, id));
        for (const g of body.generations) {
          await tx.insert(generations).values({
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
            nsfw: (g.nsfw as boolean | undefined) ?? true,
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
      if (body.generationImages) {
        for (const img of body.generationImages) {
          await tx.insert(generationImages).values({
            generationId: img.generationId as string,
            sequenceIndex: img.sequenceIndex as number,
            upstreamResultUrl: (img.upstreamResultUrl as string | null) ?? null,
            r2Url: img.r2Url as string,
            r2Key: img.r2Key as string,
            mimeType: (img.mimeType as string | undefined) ?? "image/png",
            width: (img.width as number | null) ?? null,
            height: (img.height as number | null) ?? null,
            sizeBytes: (img.sizeBytes as number | null) ?? null,
          });
        }
      }
      if (body.generationLikes) {
        for (const l of body.generationLikes) {
          await tx.insert(generationLikes).values({
            generationId: l.generationId as string,
            userId: (l.userId as number) ?? userId,
          });
        }
      }
    });
  },

  // Theme is single-row per user keyed by userId. The route-level `:id` is
  // ignored because there is only one row. Payload shape: `{ themeJson: ... }`
  // OR the raw theme JSON itself (we accept either for client convenience).
  theme: async (db, userId, _id, expiresAt, payload) => {
    const body = (payload ?? {}) as Record<string, unknown>;
    const themeJson = (body.themeJson as unknown) ?? (body as unknown);
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

// ---------------------------------------------------------------------------
// Remove sync. v4 = IDB canonical. Hard-delete server row + FK cascade
// children. Local SQLocal keeps its copy untouched and reverts to local-only.
// ---------------------------------------------------------------------------

export async function clearSyncExpiry(
  userId: number,
  kind: SyncKind,
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
    case "generationSessions":
      result = await db
        .delete(generationSessions)
        .where(
          and(
            eq(generationSessions.id, id),
            eq(generationSessions.userId, userId),
          ),
        )
        .returning({ id: generationSessions.id });
      break;
    case "theme":
      // `id` ignored — user_themes is keyed by userId.
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
