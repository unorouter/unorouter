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
  conversationSettings,
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
    settings: typeof conversationSettings.$inferSelect | null;
    conversationCharacters: (typeof conversationCharacters.$inferSelect)[];
    conversationLorebooks: (typeof conversationLorebooks.$inferSelect)[];
    messages: (typeof messages.$inferSelect)[];
    messageItems: (typeof messageItems.$inferSelect)[];
    media: (typeof media.$inferSelect)[];
    requestLogs: (typeof requestLogs.$inferSelect)[];
    // Referenced RP entity bodies inlined so a fresh-OPFS pull on a second
    // device can render the conv even when the entity was never synced
    // standalone. Mirrors the self-contained shape of the push payload.
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
      const [
        settingsRows,
        convCharsRows,
        convLbsRows,
        msgsRows,
        mediaRows,
        reqLogRows,
      ] = await Promise.all([
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
        db.select().from(requestLogs).where(eq(requestLogs.convId, id)),
      ]);
      const msgIds = msgsRows.map((m) => m.id);
      const items = msgIds.length
        ? await db
            .select()
            .from(messageItems)
            .where(inArray(messageItems.messageId, msgIds))
        : [];

      // Inline every referenced RP entity so a fresh-OPFS pull on a second
      // device renders the conv without first re-syncing each entity.
      const refCharIds = convCharsRows.map((b) => b.characterId);
      const refLbIds = convLbsRows.map((b) => b.lorebookId);
      const refPersonaId = settingsRows[0]?.personaId ?? null;
      const refPresetId = settingsRows[0]?.presetId ?? null;
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
        conversation: rows[0],
        settings: settingsRows[0] ?? null,
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
