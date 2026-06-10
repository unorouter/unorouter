"use client";

import { readLocalConversationBundle } from "@/lib/db/client/data/chat";
import { readLocalGenerationSessionBundle } from "@/lib/db/client/data/playground";
import {
  readLocalCard,
  readLocalCharacter,
  readLocalLorebook,
  readLocalPersona,
  readLocalPreset,
} from "@/lib/db/client/data/rp";
import type { SyncKindName } from "@/lib/validation/sync";

// Cascade payload per kind; shared by add/resync + drainer.
export async function buildSyncPayload(
  userId: number,
  kind: SyncKindName,
  id: string,
): Promise<unknown> {
  switch (kind) {
    case "conversations": {
      const bundle = await readLocalConversationBundle(userId, id);
      // Settings ride the conversation row; request logs are server-persisted.
      return (
        bundle && { ...bundle, settings: undefined, requestLogs: undefined }
      );
    }
    case "playgroundSessions":
      return readLocalGenerationSessionBundle(userId, id);
    case "lorebooks": {
      const lb = await readLocalLorebook(userId, id);
      return (
        lb && { lorebook: { ...lb, entries: undefined }, entries: lb.entries }
      );
    }
    case "cards": {
      const card = await readLocalCard(userId, id);
      return (
        card && {
          card: {
            ...card,
            cardCharacters: undefined,
            cardLorebooks: undefined,
          },
          cardCharacters: card.cardCharacters,
          cardLorebooks: card.cardLorebooks,
        }
      );
    }
    case "characters":
      return readLocalCharacter(userId, id);
    case "personas":
      return readLocalPersona(userId, id);
    case "presets":
      return readLocalPreset(userId, id);
    case "theme":
      // Theme uses a dedicated hook with explicit payload.
      return undefined;
  }
}
