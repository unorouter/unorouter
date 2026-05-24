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
      return {
        conversation: rows[0],
        settings: settingsRows[0] ?? null,
        conversationCharacters: convCharsRows,
        conversationLorebooks: convLbsRows,
        messages: msgsRows,
        messageItems: items,
        media: mediaRows,
        requestLogs: reqLogRows,
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
