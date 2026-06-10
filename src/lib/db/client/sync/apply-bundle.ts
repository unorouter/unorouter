"use client";

import type { SyncBundle } from "@/server/ai/sync/bundles";
import type { SyncKindName } from "@/lib/validation/sync-constants";
import {
  readLocalCard,
  readLocalCharacter,
  readLocalLorebook,
  readLocalPersona,
  readLocalPreset,
  upsertLocalCardBundle,
  upsertLocalCharacter,
  upsertLocalLorebookBundle,
  upsertLocalPersona,
  upsertLocalPreset,
} from "../data/rp";
import { upsertLocalConversationBundle } from "../data/chat";
import { upsertLocalGenerationSessionBundle } from "../data/playground";
import { upsertLocalTheme } from "../data/theme";
import { rehydrateMediaBatch } from "./rehydrate-media";

// Re-check right before the write: an edit made while the bundle was in
// flight (reconcile snapshots local updatedAt before the network fetch)
// must not be clobbered by the older remote copy.
async function localNewer(
  userId: number,
  read: (uid: number, id: string) => Promise<{ updatedAt: Date } | null>,
  id: string,
  remoteUpdatedAt: Date | string,
): Promise<boolean> {
  const existing = await read(userId, id);
  return (
    existing != null &&
    new Date(existing.updatedAt).getTime() >=
      new Date(remoteUpdatedAt).getTime()
  );
}

export async function applyBundle<K extends SyncKindName>(
  userId: number,
  kind: K,
  bundle: SyncBundle<K>,
): Promise<{ skippedLocalNewer: number } | void> {
  const skip = { skippedLocalNewer: 1 };
  switch (kind) {
    case "characters": {
      const b = bundle as SyncBundle<"characters">;
      if (
        await localNewer(
          userId,
          readLocalCharacter,
          b.character.id,
          b.character.updatedAt,
        )
      )
        return skip;
      await upsertLocalCharacter(userId, b.character);
      return;
    }
    case "personas": {
      const b = bundle as SyncBundle<"personas">;
      if (
        await localNewer(
          userId,
          readLocalPersona,
          b.persona.id,
          b.persona.updatedAt,
        )
      )
        return skip;
      await upsertLocalPersona(userId, b.persona);
      return;
    }
    case "lorebooks": {
      const b = bundle as SyncBundle<"lorebooks">;
      if (
        await localNewer(
          userId,
          readLocalLorebook,
          b.lorebook.id,
          b.lorebook.updatedAt,
        )
      )
        return skip;
      await upsertLocalLorebookBundle(userId, {
        lorebook: b.lorebook,
        entries: b.entries,
      });
      return;
    }
    case "presets": {
      const b = bundle as SyncBundle<"presets">;
      if (
        await localNewer(userId, readLocalPreset, b.preset.id, b.preset.updatedAt)
      )
        return skip;
      await upsertLocalPreset(userId, b.preset);
      return;
    }
    case "cards": {
      const b = bundle as SyncBundle<"cards">;
      if (await localNewer(userId, readLocalCard, b.card.id, b.card.updatedAt))
        return skip;
      await upsertLocalCardBundle(userId, {
        card: b.card,
        cardCharacters: b.cardCharacters,
        cardLorebooks: b.cardLorebooks,
      });
      return;
    }
    case "conversations": {
      const b = bundle as SyncBundle<"conversations">;
      const rehydratedMedia = await rehydrateMediaBatch(userId, b.media);
      // Insert-only: skip when local exists so local edits aren't clobbered.
      const insertAbsent = async <T>(
        rows: T[] | undefined,
        idOf: (row: T) => string,
        read: (uid: number, id: string) => Promise<unknown>,
        write: (uid: number, row: T) => Promise<unknown>,
      ) => {
        for (const row of rows ?? []) {
          if (!(await read(userId, idOf(row)))) await write(userId, row);
        }
      };
      await insertAbsent(
        b.characters,
        (c) => c.id,
        readLocalCharacter,
        upsertLocalCharacter,
      );
      await insertAbsent(
        b.personas,
        (p) => p.id,
        readLocalPersona,
        upsertLocalPersona,
      );
      await insertAbsent(
        b.presets,
        (p) => p.id,
        readLocalPreset,
        upsertLocalPreset,
      );
      await insertAbsent(
        b.lorebooks,
        (lb) => lb.lorebook.id,
        readLocalLorebook,
        (uid, lb) =>
          upsertLocalLorebookBundle(uid, {
            lorebook: lb.lorebook,
            entries: lb.entries,
          }),
      );
      return upsertLocalConversationBundle(userId, {
        conversation: b.conversation,
        // Sync wire carries settings on the conversation row; null keeps the
        // import-path fold (which still receives a settings object) intact.
        settings: null,
        conversationCharacters: b.conversationCharacters,
        conversationLorebooks: b.conversationLorebooks,
        messages: b.messages,
        messageItems: b.messageItems,
        media: rehydratedMedia,
        requestLogs: b.requestLogs,
      });
    }
    case "playgroundSessions": {
      const b = bundle as SyncBundle<"playgroundSessions">;
      const rehydratedMedia = await rehydrateMediaBatch(userId, b.media);
      await upsertLocalGenerationSessionBundle(userId, {
        session: b.session,
        playgrounds: b.playgrounds,
        media: rehydratedMedia,
      });
      return;
    }
    case "theme": {
      const b = bundle as SyncBundle<"theme">;
      await upsertLocalTheme(userId, b.theme.themeJson, b.theme.syncExpiresAt);
      return;
    }
  }
}
