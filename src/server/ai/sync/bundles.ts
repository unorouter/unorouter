import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import {
  cardCharacters,
  cardLorebooks,
  cards,
  characters,
  conversationCharacters,
  conversationLorebooks,
  conversations,
  playgroundSessions,
  playgrounds,
  lorebookEntries,
  lorebooks,
  media,
  messageItems,
  messages,
  personas,
  requestLogs,
  samplingPresets,
  userThemes,
} from "@/lib/db/schema/shared";
import {
  projectConversationSettings,
  type ConversationSettingsProjection,
} from "@/lib/db/conversation-settings";
import { and, eq, inArray } from "drizzle-orm";
import type { SyncKindName } from "@/lib/validation/sync";

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
    settings: ConversationSettingsProjection | null;
    conversationCharacters: (typeof conversationCharacters.$inferSelect)[];
    conversationLorebooks: (typeof conversationLorebooks.$inferSelect)[];
    messages: (typeof messages.$inferSelect)[];
    messageItems: (typeof messageItems.$inferSelect)[];
    media: (typeof media.$inferSelect)[];
    requestLogs: (typeof requestLogs.$inferSelect)[];
    // Inline referenced RP entities; fresh-OPFS pull renders without per-entity sync.
    characters: (typeof characters.$inferSelect)[];
    personas: (typeof personas.$inferSelect)[];
    lorebooks: Array<{
      lorebook: typeof lorebooks.$inferSelect;
      entries: (typeof lorebookEntries.$inferSelect)[];
    }>;
    presets: (typeof samplingPresets.$inferSelect)[];
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

export type BatchBundleResult = {
  kind: SyncKindName;
  id: string;
  bundle?: unknown;
  error?: string;
};

export async function getSyncedBundlesBatch(
  userId: number,
  requests: Array<{ kind: SyncKindName; id: string }>,
): Promise<BatchBundleResult[]> {
  const results = await Promise.allSettled(
    requests.map((r) => getSyncedBundle(userId, r.kind, r.id)),
  );
  return results.map((res, i) => {
    const req = requests[i];
    if (res.status === "fulfilled") {
      return { kind: req.kind, id: req.id, bundle: res.value };
    }
    return { kind: req.kind, id: req.id, error: String(res.reason) };
  });
}

// Owned-row fetch: id + userId scoped, 404s via assertFound.
type OwnedTable =
  | typeof characters
  | typeof personas
  | typeof lorebooks
  | typeof samplingPresets
  | typeof cards
  | typeof conversations
  | typeof playgroundSessions;
async function ownedRow<T extends OwnedTable>(
  db: ReturnType<typeof getDb>,
  table: T,
  id: string,
  userId: number,
): Promise<T["$inferSelect"]> {
  const rows = await db
    .select()
    .from(table as OwnedTable)
    .where(and(eq(table.id, id), eq(table.userId, userId)))
    .limit(1);
  assertFound(rows);
  return rows[0] as T["$inferSelect"];
}

export async function getSyncedBundle(
  userId: number,
  kind: SyncKindName,
  id: string,
) {
  const db = getDb();
  switch (kind) {
    case "characters":
      return { character: await ownedRow(db, characters, id, userId) };
    case "personas":
      return { persona: await ownedRow(db, personas, id, userId) };
    case "lorebooks": {
      const lorebook = await ownedRow(db, lorebooks, id, userId);
      const entries = await db
        .select()
        .from(lorebookEntries)
        .where(eq(lorebookEntries.lorebookId, id));
      return { lorebook, entries };
    }
    case "presets":
      return { preset: await ownedRow(db, samplingPresets, id, userId) };
    case "cards": {
      const card = await ownedRow(db, cards, id, userId);
      const [chars, lbs] = await Promise.all([
        db.select().from(cardCharacters).where(eq(cardCharacters.cardId, id)),
        db.select().from(cardLorebooks).where(eq(cardLorebooks.cardId, id)),
      ]);
      return { card, cardCharacters: chars, cardLorebooks: lbs };
    }
    case "conversations": {
      const conversation = await ownedRow(db, conversations, id, userId);
      const settings = projectConversationSettings(conversation);
      const [convCharsRows, convLbsRows, msgsRows, mediaRows, reqLogRows] =
        await Promise.all([
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
          db.select().from(requestLogs).where(eq(requestLogs.convId, id)),
        ]);
      const msgIds = msgsRows.map((m) => m.id);
      const items = msgIds.length
        ? await db
            .select()
            .from(messageItems)
            .where(inArray(messageItems.messageId, msgIds))
        : [];

      const refCharIds = convCharsRows.map((b) => b.characterId);
      const refLbIds = convLbsRows.map((b) => b.lorebookId);
      const refPersonaId = settings.personaId ?? null;
      const refPresetId = settings.presetId ?? null;
      const [refCharacters, refPersonas, refLbRows, refLbEntries, refPresets] =
        await Promise.all([
          refCharIds.length
            ? db
                .select()
                .from(characters)
                .where(
                  and(
                    eq(characters.userId, userId),
                    inArray(characters.id, refCharIds),
                  ),
                )
            : Promise.resolve([] as (typeof characters.$inferSelect)[]),
          refPersonaId
            ? db
                .select()
                .from(personas)
                .where(
                  and(
                    eq(personas.userId, userId),
                    eq(personas.id, refPersonaId),
                  ),
                )
            : Promise.resolve([] as (typeof personas.$inferSelect)[]),
          refLbIds.length
            ? db
                .select()
                .from(lorebooks)
                .where(
                  and(
                    eq(lorebooks.userId, userId),
                    inArray(lorebooks.id, refLbIds),
                  ),
                )
            : Promise.resolve([] as (typeof lorebooks.$inferSelect)[]),
          refLbIds.length
            ? db
                .select()
                .from(lorebookEntries)
                .where(inArray(lorebookEntries.lorebookId, refLbIds))
            : Promise.resolve([] as (typeof lorebookEntries.$inferSelect)[]),
          refPresetId
            ? db
                .select()
                .from(samplingPresets)
                .where(
                  and(
                    eq(samplingPresets.userId, userId),
                    eq(samplingPresets.id, refPresetId),
                  ),
                )
            : Promise.resolve([] as (typeof samplingPresets.$inferSelect)[]),
        ]);

      const entriesByLbId = new Map<
        string,
        (typeof lorebookEntries.$inferSelect)[]
      >();
      for (const e of refLbEntries) {
        const arr = entriesByLbId.get(e.lorebookId) ?? [];
        arr.push(e);
        entriesByLbId.set(e.lorebookId, arr);
      }
      const inlinedLorebooks = refLbRows.map((lb) => ({
        lorebook: lb,
        entries: entriesByLbId.get(lb.id) ?? [],
      }));

      return {
        conversation,
        settings,
        conversationCharacters: convCharsRows,
        conversationLorebooks: convLbsRows,
        messages: msgsRows,
        messageItems: items,
        media: mediaRows,
        requestLogs: reqLogRows,
        characters: refCharacters,
        personas: refPersonas,
        lorebooks: inlinedLorebooks,
        presets: refPresets,
      };
    }
    case "playgroundSessions": {
      const session = await ownedRow(db, playgroundSessions, id, userId);
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
      return { session, playgrounds: gens, media: mediaRows };
    }
    case "theme": {
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
