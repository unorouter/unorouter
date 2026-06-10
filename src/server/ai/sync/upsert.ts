import type { UserTheme } from "@/components/ui/theme/theme-store";
import { mediaKey, uploadToR2 } from "@/lib/config/r2";
import type { getDb } from "@/lib/db/server/client";
import {
  cardCharacters,
  cardLorebooks,
  cards,
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversations,
  lorebookEntries,
  lorebooks,
  media,
  messageItems,
  messages,
  personas,
  playgroundSessions,
  playgrounds,
  samplingPresets,
  userThemes,
} from "@/lib/db/schema/shared";
import { CONVERSATION_SETTINGS_KEYS } from "@/lib/db/conversation-settings";
import { uid } from "@/lib/utils/base";
import {
  characterBody,
  lorebookBody,
  lorebookEntryBody,
  personaBody,
  samplingPresetBody,
  type LorebookBody,
} from "@/lib/validation/rp";
import {
  cardBundleBody,
  conversationBundleBody,
  playgroundSessionBundleBody,
  themeBundleBody,
  type CardBundleBody,
  type ConversationBundleBody,
  type PlaygroundSessionBundleBody,
  type SyncMergeMode,
  type ThemeBundleBody,
} from "@/lib/validation/sync";
import { type SyncKindName } from "@/lib/validation/sync-constants";
import { and, eq, inArray } from "drizzle-orm";
import { castWithDriftLog } from "./payload-validate";

export const DEFAULT_TTL_DAYS = 30;

type SyncTx = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

export type UpsertHandler = (
  db: ReturnType<typeof getDb>,
  userId: number,
  id: string,
  expiresAt: Date,
  payload: unknown,
  mergeMode?: SyncMergeMode,
) => Promise<void>;

// Client timestamp passthrough; legacy payloads without one keep old behavior.
function asDate(v: unknown): Date | undefined {
  return v == null ? undefined : new Date(v as string | number | Date);
}

export function stripUndefined<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

// PATCH set: only schema-declared fields, only when present; keeps update
// field lists in lockstep with the schema instead of hand-maintained.
function pickSchemaFields(
  body: Record<string, unknown>,
  schema: { properties: Record<string, unknown> },
): Record<string, unknown> {
  return stripUndefined(
    Object.fromEntries(Object.keys(schema.properties).map((k) => [k, body[k]])),
  );
}

// NOT onConflictDoUpdate: PK is the global `id`, so a conflict-update would let
// a payload carrying someone else's entity id write across users; the userId
// in the WHERE keeps both branches scoped.
type ScopedTable =
  | typeof characters
  | typeof personas
  | typeof lorebooks
  | typeof samplingPresets
  | typeof cards
  | typeof playgroundSessions;
async function upsertScoped(
  tx: SyncTx,
  table: ScopedTable,
  userId: number,
  id: string,
  expiresAt: Date,
  insertValues: Record<string, unknown>,
  updateSet: Record<string, unknown>,
): Promise<void> {
  const where = and(eq(table.id, id), eq(table.userId, userId));
  const existing = await tx
    .select({ id: table.id })
    .from(table)
    .where(where)
    .limit(1);
  if (existing.length === 0) {
    await tx.insert(table).values(insertValues as never);
  } else {
    await tx
      .update(table)
      .set({
        ...updateSet,
        syncExpiresAt: expiresAt,
        updatedAt: (updateSet.updatedAt as Date | undefined) ?? new Date(),
      } as never)
      .where(where);
  }
}

// Insert-value builder: loose sync payload -> typed insert row via
// castWithDriftLog. `fill` backstops Optional schema fields with NOT NULL
// columns (isDefault); cast output overrides it when present.
type InsertValuesFn = (
  body: unknown,
  userId: number,
  id: string,
  expiresAt: Date,
) => Record<string, unknown>;

function insertValuesFor(
  schema: Parameters<typeof castWithDriftLog>[0],
  ctx: string,
  fill: Record<string, unknown> = {},
): InsertValuesFn {
  return (body, userId, id, expiresAt) => {
    const v = castWithDriftLog(schema, body, ctx);
    const raw = (body ?? {}) as Record<string, unknown>;
    return {
      ...fill,
      ...stripUndefined(v as Record<string, unknown>),
      ...stripUndefined({
        createdAt: asDate(raw.createdAt),
        updatedAt: asDate(raw.updatedAt),
      }),
      id,
      userId,
      syncExpiresAt: expiresAt,
    };
  };
}

const characterInsertValues = insertValuesFor(
  characterBody,
  "sync.upsert.character",
);
const personaInsertValues = insertValuesFor(
  personaBody,
  "sync.upsert.persona",
  {
    isDefault: false,
  },
);
const presetInsertValues = insertValuesFor(
  samplingPresetBody,
  "sync.upsert.preset",
  { isDefault: false },
);
const lorebookInsertValues = insertValuesFor(
  lorebookBody,
  "sync.upsert.lorebook",
);

function lorebookEntryInsertValues(
  e: unknown,
  lorebookId: string,
): typeof lorebookEntries.$inferInsert {
  const v = castWithDriftLog(lorebookEntryBody, e, "sync.upsert.lorebookEntry");
  const id = (e as { id?: unknown }).id;
  return {
    ...v,
    id: typeof id === "string" ? id : crypto.randomUUID(),
    lorebookId,
  };
}

// Conversations bundle: insert each bound RP entity if absent, inside the conv tx,
// before conversation_* rows (FKs). They inherit the conv expiresAt; insert-only, synced rows untouched.

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

async function insertReferencedEntity(
  tx: SyncTx,
  table: typeof characters | typeof personas | typeof samplingPresets,
  userId: number,
  expiresAt: Date,
  body: Record<string, unknown>,
  values: (
    body: unknown,
    userId: number,
    id: string,
    expiresAt: Date,
  ) => Record<string, unknown>,
): Promise<void> {
  const id = body.id as string;
  if (!id || (await rowExists(tx, table, id, userId))) return;
  await tx.insert(table).values(values(body, userId, id, expiresAt) as never);
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
    .values(lorebookInsertValues(lb, userId, id, expiresAt) as never);
  for (const e of (entry.entries ?? []) as Array<Record<string, unknown>>) {
    await tx.insert(lorebookEntries).values(lorebookEntryInsertValues(e, id));
  }
}

// Upload R2 blobs pre-tx so latency doesn't hold the libSQL write lock.
type MediaPayloadRow = {
  id: string;
  mimeType: string;
  dataBase64?: string | null;
  r2Key?: string | null;
  r2Url?: string | null;
};

async function preUploadMedia(
  scope: string,
  rows: MediaPayloadRow[] | undefined,
): Promise<Map<string, { r2Key: string; r2Url: string }>> {
  const uploaded = new Map<string, { r2Key: string; r2Url: string }>();
  if (!rows || rows.length === 0) return uploaded;
  await Promise.all(
    rows.map(async (m) => {
      if (m.r2Key || !m.dataBase64) return;
      const buffer = Buffer.from(m.dataBase64, "base64");
      const r2Key = mediaKey("user", scope, m.id, uid(8));
      const up = await uploadToR2(r2Key, buffer, m.mimeType);
      uploaded.set(m.id, { r2Key, r2Url: up.url });
    }),
  );
  return uploaded;
}

// Per-kind upsert handlers.

// Plain single-row kinds: cast -> scoped insert-or-patch, one transaction.
function scopedKindHandler(
  table: ScopedTable,
  schema: { properties: Record<string, unknown> },
  values: InsertValuesFn,
): UpsertHandler {
  return async (db, userId, id, expiresAt, payload) => {
    const body = (payload ?? {}) as Record<string, unknown>;
    await db.transaction((tx) =>
      upsertScoped(
        tx,
        table,
        userId,
        id,
        expiresAt,
        values(body, userId, id, expiresAt),
        {
          ...pickSchemaFields(body, schema),
          ...stripUndefined({ updatedAt: asDate(body.updatedAt) }),
        },
      ),
    );
  };
}

export const upsertHandlers: Record<SyncKindName, UpsertHandler> = {
  characters: scopedKindHandler(
    characters,
    characterBody,
    characterInsertValues,
  ),

  personas: scopedKindHandler(personas, personaBody, personaInsertValues),

  lorebooks: async (db, userId, id, expiresAt, payload) => {
    const body = (payload ?? {}) as {
      lorebook?: Partial<LorebookBody>;
      entries?: unknown[];
    };
    const lb = body.lorebook ?? {};
    await db.transaction(async (tx) => {
      await upsertScoped(
        tx,
        lorebooks,
        userId,
        id,
        expiresAt,
        lorebookInsertValues(lb, userId, id, expiresAt),
        {
          ...pickSchemaFields(lb, lorebookBody),
          ...stripUndefined({
            updatedAt: asDate((lb as Record<string, unknown>).updatedAt),
          }),
        },
      );
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

  presets: scopedKindHandler(
    samplingPresets,
    samplingPresetBody,
    presetInsertValues,
  ),

  cards: async (db, userId, id, expiresAt, payload) => {
    const body: CardBundleBody = castWithDriftLog(
      cardBundleBody,
      payload ?? {},
      "sync.upsert.cardBundle",
    );
    const c = body.card ?? {};
    await db.transaction(async (tx) => {
      await upsertScoped(
        tx,
        cards,
        userId,
        id,
        expiresAt,
        {
          id,
          userId,
          name: c.name ?? "Untitled",
          description: c.description ?? null,
          personaId: c.personaId ?? null,
          createdAt: asDate(c.createdAt),
          updatedAt: asDate(c.updatedAt),
          syncExpiresAt: expiresAt,
        },
        stripUndefined({
          name: c.name,
          description: c.description,
          personaId: c.personaId,
          updatedAt: asDate(c.updatedAt),
        }),
      );
      // Inline entity bodies first so the join-table FKs below resolve even
      // when the referenced character/lorebook was never synced on its own.
      for (const ch of body.characters ?? []) {
        await insertReferencedEntity(
          tx,
          characters,
          userId,
          expiresAt,
          ch,
          characterInsertValues,
        );
      }
      for (const lb of body.lorebooks ?? []) {
        await insertReferencedLorebook(tx, userId, expiresAt, lb);
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

  conversations: async (db, userId, id, expiresAt, payload, mergeMode) => {
    const mode: SyncMergeMode = mergeMode ?? "replace";
    const body: ConversationBundleBody = castWithDriftLog(
      conversationBundleBody,
      payload ?? {},
      "sync.upsert.conversationBundle",
    );
    const c = body.conversation ?? {};
    // Upload R2 before tx (latency).
    const mediaUploads = await preUploadMedia(id, body.media);
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
        .limit(1);
      // Settings columns live on the conversation row; a legacy `settings`
      // object (older clients) overlays on top.
      const s = stripUndefined({
        ...Object.fromEntries(
          CONVERSATION_SETTINGS_KEYS.map((k) => [
            k,
            (c as Record<string, unknown>)[k],
          ]),
        ),
        ...(body.settings ?? {}),
      }) as NonNullable<ConversationBundleBody["settings"]>;
      if (existing.length === 0) {
        // Omitted keys fall to schema defaults; nullable inherit-from-preset
        // fields stay null, preserving inherit semantics on a sync roundtrip.
        await tx.insert(conversations).values({
          ...(stripUndefined(
            Object.fromEntries(
              CONVERSATION_SETTINGS_KEYS.map((k) => [k, s?.[k] ?? undefined]),
            ),
          ) as Partial<typeof conversations.$inferInsert>),
          id,
          userId,
          title: c.title ?? null,
          totalInputTokens: c.totalInputTokens ?? 0,
          totalOutputTokens: c.totalOutputTokens ?? 0,
          totalCost: c.totalCost ?? 0,
          defaultModel: s?.defaultModel ?? "",
          createdAt: asDate(c.createdAt),
          updatedAt: asDate(c.updatedAt),
          syncExpiresAt: expiresAt,
        });
      } else {
        await tx
          .update(conversations)
          .set({
            ...stripUndefined({
              title: c.title,
              totalInputTokens: c.totalInputTokens,
              totalOutputTokens: c.totalOutputTokens,
              totalCost: c.totalCost,
              ...(s ?? {}),
            }),
            syncExpiresAt: expiresAt,
            updatedAt: asDate(c.updatedAt) ?? new Date(),
          })
          .where(
            and(eq(conversations.id, id), eq(conversations.userId, userId)),
          );
      }

      // Upsert referenced RP entities before conv_* rows (FK).
      for (const ch of body.characters ?? []) {
        await insertReferencedEntity(
          tx,
          characters,
          userId,
          expiresAt,
          ch,
          characterInsertValues,
        );
      }
      for (const p of body.personas ?? []) {
        await insertReferencedEntity(
          tx,
          personas,
          userId,
          expiresAt,
          p,
          personaInsertValues,
        );
      }
      for (const lb of body.lorebooks ?? []) {
        await insertReferencedLorebook(tx, userId, expiresAt, lb);
      }
      for (const pr of body.presets ?? []) {
        await insertReferencedEntity(
          tx,
          samplingPresets,
          userId,
          expiresAt,
          pr,
          presetInsertValues,
        );
      }

      if (body.conversationCharacters) {
        // replace=wipe+reinsert (authoritative).
        // upsert/append=merge by composite PK (preserve parallel edits).
        if (mode === "replace") {
          await tx
            .delete(conversationCharacters)
            .where(eq(conversationCharacters.convId, id));
        }
        for (const row of body.conversationCharacters) {
          // Pass undefined not null; libSQL miscounts bind params on explicit null.
          const values = {
            convId: id,
            characterId: row.characterId,
            orderIndex: row.orderIndex ?? 0,
            isActive: row.isActive ?? true,
            talkness: row.talkness ?? undefined,
            overrides: row.overrides ?? undefined,
          };
          if (mode === "replace") {
            await tx.insert(conversationCharacters).values(values);
          } else {
            await tx
              .insert(conversationCharacters)
              .values(values)
              .onConflictDoUpdate({
                target: [
                  conversationCharacters.convId,
                  conversationCharacters.characterId,
                ],
                set: {
                  orderIndex: values.orderIndex,
                  isActive: values.isActive,
                  talkness: values.talkness,
                  overrides: values.overrides,
                },
              });
          }
        }
      }

      if (body.conversationLorebooks) {
        if (mode === "replace") {
          await tx
            .delete(conversationLorebooks)
            .where(eq(conversationLorebooks.convId, id));
        }
        for (const row of body.conversationLorebooks) {
          const values = {
            convId: id,
            lorebookId: row.lorebookId,
            orderIndex: row.orderIndex ?? 0,
          };
          if (mode === "replace") {
            await tx.insert(conversationLorebooks).values(values);
          } else {
            await tx
              .insert(conversationLorebooks)
              .values(values)
              .onConflictDoUpdate({
                target: [
                  conversationLorebooks.convId,
                  conversationLorebooks.lorebookId,
                ],
                set: { orderIndex: values.orderIndex },
              });
          }
        }
      }

      if (body.messages) {
        if (mode === "replace") {
          await tx.delete(messages).where(eq(messages.convId, id));
        }
        // Null parentId when target missing (FK).
        const existingMsgIds =
          mode === "replace"
            ? new Set<string>()
            : new Set(
                (
                  await tx
                    .select({ id: messages.id })
                    .from(messages)
                    .where(eq(messages.convId, id))
                ).map((r) => r.id),
              );
        const validParentIds = new Set<string>([
          ...existingMsgIds,
          ...body.messages.map((m) => m.id),
        ]);
        for (const m of body.messages) {
          const parentId =
            m.parentId && validParentIds.has(m.parentId) ? m.parentId : null;
          const values = {
            id: m.id,
            convId: id,
            parentId,
            createdAt: asDate(m.createdAt),
            updatedAt: asDate(m.updatedAt),
            characterId: m.characterId ?? null,
            role: m.role,
            model: m.model ?? null,
            playgroundId: m.playgroundId ?? null,
            inputTokens: m.inputTokens ?? null,
            outputTokens: m.outputTokens ?? null,
            cost: m.cost ?? null,
            durationMs: m.durationMs ?? null,
            tokensPerSecond: m.tokensPerSecond ?? null,
            branchIndex: m.branchIndex ?? 0,
            isActiveBranch: m.isActiveBranch ?? true,
            isEdited: m.isEdited ?? false,
          };
          if (mode === "upsert") {
            const { id: _mid, ...rest } = values;
            await tx
              .insert(messages)
              .values(values)
              .onConflictDoUpdate({ target: messages.id, set: rest });
          } else if (mode === "append") {
            await tx.insert(messages).values(values).onConflictDoNothing();
          } else {
            await tx.insert(messages).values(values);
          }
        }
      }

      if (body.messageItems) {
        // upsert wipes items per touched message; append leaves siblings.
        if (mode === "upsert" && body.messages) {
          const msgIds = body.messages.map((m) => m.id).filter(Boolean);
          if (msgIds.length > 0) {
            await tx
              .delete(messageItems)
              .where(inArray(messageItems.messageId, msgIds));
          }
        }
        for (const it of body.messageItems) {
          const values = {
            id: it.id,
            messageId: it.messageId,
            createdAt: asDate(it.createdAt),
            sequenceIndex: it.sequenceIndex,
            outputIndex: it.outputIndex ?? null,
            type: it.type,
            data: it.data,
          };
          if (mode === "append") {
            await tx.insert(messageItems).values(values).onConflictDoNothing();
          } else {
            await tx.insert(messageItems).values(values);
          }
        }
      }

      if (body.media) {
        if (mode === "replace") {
          await tx.delete(media).where(eq(media.convId, id));
        }
        for (const m of body.media) {
          const up = mediaUploads.get(m.id);
          const r2Key = up?.r2Key ?? m.r2Key ?? null;
          const r2Url = up?.r2Url ?? m.r2Url ?? null;

          const mediaValues = {
            id: m.id,
            userId,
            convId: id,
            r2Key,
            r2Url,
            dataBase64: null,
            mimeType: m.mimeType,
            sizeBytes: m.sizeBytes,
            extractedText: m.extractedText ?? null,
          };
          if (mode === "replace") {
            await tx.insert(media).values(mediaValues);
          } else {
            await tx.insert(media).values(mediaValues).onConflictDoNothing();
          }
        }
      }
    });
  },

  playgroundSessions: async (db, userId, id, expiresAt, payload) => {
    const body: PlaygroundSessionBundleBody = castWithDriftLog(
      playgroundSessionBundleBody,
      payload ?? {},
      "sync.upsert.playgroundSessionBundle",
    );
    const s = body.session ?? {};
    const mediaUploads = await preUploadMedia(id, body.media);
    await db.transaction(async (tx) => {
      // Wire dates arrive as ISO strings (JSON); drizzle timestamp columns
      // need Date objects.
      const fallbackExpires = asDate(s.expiresAt) ?? expiresAt;
      await upsertScoped(
        tx,
        playgroundSessions,
        userId,
        id,
        expiresAt,
        {
          id,
          userId,
          title: s.title ?? null,
          firstModel: s.firstModel ?? null,
          snapshotCount: s.snapshotCount ?? 0,
          imageCount: s.imageCount ?? 0,
          expiresAt: fallbackExpires,
          createdAt: asDate(s.createdAt),
          updatedAt: asDate(s.updatedAt),
          syncExpiresAt: expiresAt,
        },
        stripUndefined({
          title: s.title,
          firstModel: s.firstModel,
          snapshotCount: s.snapshotCount,
          imageCount: s.imageCount,
          expiresAt: asDate(s.expiresAt),
          updatedAt: asDate(s.updatedAt),
        }),
      );
      if (body.playgrounds) {
        await tx.delete(playgrounds).where(eq(playgrounds.sessionId, id));
        for (const g of body.playgrounds) {
          await tx.insert(playgrounds).values({
            id: g.id,
            userId,
            sessionId: id,
            sessionOrder: g.sessionOrder,
            requestedCount: g.requestedCount ?? 1,
            taskId: g.taskId ?? null,
            model: g.model,
            prompt: g.prompt,
            negativePrompt: g.negativePrompt ?? null,
            params: g.params ?? null,
            loras: g.loras ?? null,
            references: g.references ?? null,
            extraParams: g.extraParams ?? null,
            status: g.status ?? "pending",
            progress: g.progress ?? null,
            costQuota: g.costQuota ?? null,
            visibility: g.visibility ?? "private",
            flagged: g.flagged ?? false,
            flagReason: g.flagReason ?? null,
            remixCount: g.remixCount ?? 0,
            likeCount: g.likeCount ?? 0,
            remixedFrom: g.remixedFrom ?? null,
            errorMessage: g.errorMessage ?? null,
            submittedKey: g.submittedKey ?? null,
            expiresAt: asDate(g.expiresAt) ?? fallbackExpires,
          });
        }
      }
      // Gen images: base64 -> R2; Turso pointer-only.
      if (body.media) {
        for (const m of body.media) {
          const mediaId = m.id;
          const up = mediaUploads.get(mediaId);
          const r2Key = up?.r2Key ?? m.r2Key ?? null;
          const r2Url = up?.r2Url ?? m.r2Url ?? null;
          await tx
            .delete(media)
            .where(and(eq(media.id, mediaId), eq(media.userId, userId)));
          await tx.insert(media).values({
            id: mediaId,
            userId,
            convId: null,
            playgroundId: m.playgroundId ?? null,
            sequenceIndex: m.sequenceIndex ?? null,
            upstreamResultUrl: m.upstreamResultUrl ?? null,
            r2Key,
            r2Url,
            dataBase64: null,
            mimeType: m.mimeType,
            sizeBytes: m.sizeBytes,
            width: m.width ?? null,
            height: m.height ?? null,
            extractedText: m.extractedText ?? null,
          });
        }
      }
    });
  },

  // Theme: single row per user; accepts envelope or raw JSON.
  theme: async (db, userId, _id, expiresAt, payload) => {
    const body: ThemeBundleBody = castWithDriftLog(
      themeBundleBody,
      payload ?? {},
      "sync.upsert.themeBundle",
    );
    const wrapped =
      body && typeof body === "object" && "themeJson" in body
        ? (body as { themeJson: unknown }).themeJson
        : body;
    const themeJson = wrapped as UserTheme;
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
