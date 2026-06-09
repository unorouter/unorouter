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
  requestLogs,
  samplingPresets,
  userThemes,
} from "@/lib/db/schema/shared";
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
import {
  cardBundleBody,
  conversationBundleBody,
  playgroundSessionBundleBody,
  themeBundleBody,
  type CardBundleBody,
  type ConversationBundleBody,
  type PlaygroundSessionBundleBody,
  type SyncKindName,
  type SyncMergeMode,
  type ThemeBundleBody,
} from "@/lib/validation/sync";
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

export function stripUndefined<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  const out: Partial<T> = {};
  for (const k in obj) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

// Insert-value builders: map a loose sync payload to a typed insert row.
// `castWithDriftLog` validates against the shared RP schema, coerces, fills
// defaults, drops extras (id/userId/timestamps).

function characterInsertValues(
  body: unknown,
  userId: number,
  id: string,
  expiresAt: Date,
): typeof characters.$inferInsert {
  const v = castWithDriftLog(characterBody, body, "sync.upsert.character");
  return { ...v, id, userId, syncExpiresAt: expiresAt };
}

function personaInsertValues(
  body: unknown,
  userId: number,
  id: string,
  expiresAt: Date,
): typeof personas.$inferInsert {
  const v = castWithDriftLog(personaBody, body, "sync.upsert.persona");
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
  const v = castWithDriftLog(samplingPresetBody, body, "sync.upsert.preset");
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
  const v = castWithDriftLog(lorebookBody, lb, "sync.upsert.lorebook");
  return { ...v, id, userId, syncExpiresAt: expiresAt };
}

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

// Referenced-entity upserts (conversations bundle): insert each bound RP
// entity if absent, inside the conversation's tx, before conversation_* rows
// so FKs resolve. Bound entities inherit the conversation's `expiresAt`.
// Insert-only: already-synced entities keep their own row untouched.

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

export const upsertHandlers: Record<SyncKindName, UpsertHandler> = {
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
              backgroundMediaId: body.backgroundMediaId,
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
              turnTriggers: body.turnTriggers,
              regexScripts: body.regexScripts,
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
    const body: CardBundleBody = castWithDriftLog(
      cardBundleBody,
      payload ?? {},
      "sync.upsert.cardBundle",
    );
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
          name: c.name ?? "Untitled",
          description: c.description ?? null,
          personaId: c.personaId ?? null,
          syncExpiresAt: expiresAt,
        });
      } else {
        await tx
          .update(cards)
          .set({
            ...stripUndefined({
              name: c.name,
              description: c.description,
              personaId: c.personaId,
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
      const s = body.settings;
      if (existing.length === 0) {
        await tx.insert(conversations).values({
          id,
          userId,
          title: c.title ?? null,
          totalInputTokens: c.totalInputTokens ?? 0,
          totalOutputTokens: c.totalOutputTokens ?? 0,
          totalCost: c.totalCost ?? 0,
          defaultModel: s?.defaultModel ?? "",
          personaId: s?.personaId ?? null,
          presetId: s?.presetId ?? null,
          systemPromptOverride: s?.systemPromptOverride ?? null,
          authorNote: s?.authorNote ?? null,
          authorNoteDepth: s?.authorNoteDepth ?? 4,
          // null = inherit the bound preset; coercing to 8 here would destroy
          // the inherit semantics on a sync roundtrip.
          chatMemory: s?.chatMemory ?? null,
          reasoningEffort: s?.reasoningEffort ?? null,
          webSearchEnabled: s?.webSearchEnabled ?? false,
          webSearchEngine: s?.webSearchEngine ?? "auto",
          webSearchContextSize: s?.webSearchContextSize ?? "medium",
          temperature: s?.temperature ?? null,
          topP: s?.topP ?? null,
          topK: s?.topK ?? null,
          minP: s?.minP ?? null,
          topA: s?.topA ?? null,
          frequencyPenalty: s?.frequencyPenalty ?? null,
          presencePenalty: s?.presencePenalty ?? null,
          repetitionPenalty: s?.repetitionPenalty ?? null,
          maxTokens: s?.maxTokens ?? null,
          extraBody: s?.extraBody ?? null,
          vars: s?.vars ?? null,
          // null = inherit the bound preset (same rationale as chatMemory).
          streamingEnabled: s?.streamingEnabled ?? null,
          groupOrderByOrder: s?.groupOrderByOrder ?? null,
          autoContinue: s?.autoContinue ?? null,
          memoryEnabled: s?.memoryEnabled ?? null,
          summaryMemory: s?.summaryMemory ?? null,
          summaryAnchor: s?.summaryAnchor ?? null,
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
            updatedAt: new Date(),
          })
          .where(
            and(eq(conversations.id, id), eq(conversations.userId, userId)),
          );
      }

      // Upsert referenced RP entities before conv_* rows (FK).
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

      if (body.requestLogs) {
        if (mode === "replace") {
          await tx.delete(requestLogs).where(eq(requestLogs.convId, id));
        }
        for (const log of body.requestLogs) {
          const values = {
            msgId: log.msgId,
            convId: id,
            requestBody: log.requestBody,
            assembledSystem: log.assembledSystem ?? null,
            finalMessages: log.finalMessages,
            responseHeaders: log.responseHeaders ?? null,
            droppedParams: log.droppedParams ?? null,
            requestId: log.requestId ?? null,
            inputTokens: log.inputTokens ?? null,
            outputTokens: log.outputTokens ?? null,
            cost: log.cost ?? null,
            durationMs: log.durationMs ?? null,
            tokensPerSecond: log.tokensPerSecond ?? null,
          };
          if (mode === "replace") {
            await tx.insert(requestLogs).values(values);
          } else {
            await tx
              .insert(requestLogs)
              .values(values)
              .onConflictDoUpdate({ target: requestLogs.msgId, set: values });
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
      const fallbackExpires = s.expiresAt ?? expiresAt;
      if (existing.length === 0) {
        await tx.insert(playgroundSessions).values({
          id,
          userId,
          title: s.title ?? null,
          firstModel: s.firstModel ?? null,
          snapshotCount: s.snapshotCount ?? 0,
          imageCount: s.imageCount ?? 0,
          expiresAt: fallbackExpires,
          syncExpiresAt: expiresAt,
        });
      } else {
        await tx
          .update(playgroundSessions)
          .set({
            ...stripUndefined({
              title: s.title,
              firstModel: s.firstModel,
              snapshotCount: s.snapshotCount,
              imageCount: s.imageCount,
              expiresAt: s.expiresAt,
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
            expiresAt: g.expiresAt ?? fallbackExpires,
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
