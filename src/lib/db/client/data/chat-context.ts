"use client";

import type { ChatContext } from "@/lib/validation/chat";
import {
  readLocalConversationBindings,
  readLocalConversationSettings,
} from "./chat";
import {
  readLocalCharacter,
  readLocalLorebookBundle,
  readLocalPersona,
  readLocalPreset,
} from "./rp";

// Builds the streamed RP context straight from SQLocal so it is always complete
// and cache-independent. The server has no DB rows for a guest, so a partial
// context would silently drop persona/characters/lorebooks from the prompt.
export async function buildChatContextFromLocalDb(
  userId: number | undefined,
  convId: string,
): Promise<ChatContext | undefined> {
  const [settings, bindings] = await Promise.all([
    readLocalConversationSettings(userId, convId),
    readLocalConversationBindings(userId, convId),
  ]);
  if (!settings) return undefined;

  const characterIds = (bindings?.conversationCharacters ?? []).map(
    (b) => b.characterId,
  );
  const lorebookIds = (bindings?.conversationLorebooks ?? []).map(
    (b) => b.lorebookId,
  );

  const [characterRows, lorebookRows, persona, preset] = await Promise.all([
    Promise.all(characterIds.map((id) => readLocalCharacter(userId, id))),
    Promise.all(lorebookIds.map((id) => readLocalLorebookBundle(userId, id))),
    settings.personaId
      ? readLocalPersona(userId, settings.personaId)
      : Promise.resolve(null),
    settings.presetId
      ? readLocalPreset(userId, settings.presetId)
      : Promise.resolve(null),
  ]);
  const characters = characterRows.filter((c) => c != null);
  const lorebooks = lorebookRows.filter((l) => l != null);

  return { persona, characters, lorebooks, preset, settings };
}
