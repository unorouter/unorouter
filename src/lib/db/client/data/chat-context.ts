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

// Streamed RP context from SQLocal. Characters travel as `{binding, character}`
// so the server assembler honors per-character isActive / overrides.
export async function buildChatContextFromLocalDb(
  userId: number | undefined,
  convId: string,
): Promise<ChatContext | undefined> {
  const [settings, bindings] = await Promise.all([
    readLocalConversationSettings(userId, convId),
    readLocalConversationBindings(userId, convId),
  ]);
  if (!settings) return undefined;

  const charBindings = bindings?.conversationCharacters ?? [];
  const lorebookIds = (bindings?.conversationLorebooks ?? []).map(
    (b) => b.lorebookId,
  );

  const [characterRows, lorebookRows, persona, preset] = await Promise.all([
    Promise.all(
      charBindings.map(async (b) => ({
        binding: b,
        character: await readLocalCharacter(userId, b.characterId),
      })),
    ),
    Promise.all(lorebookIds.map((id) => readLocalLorebookBundle(userId, id))),
    settings.personaId
      ? readLocalPersona(userId, settings.personaId)
      : Promise.resolve(null),
    settings.presetId
      ? readLocalPreset(userId, settings.presetId)
      : Promise.resolve(null),
  ]);
  const characters = characterRows
    .filter((c) => c.character != null)
    .map((c) => ({ binding: c.binding, character: c.character! }));
  const lorebooks = lorebookRows.filter((l) => l != null);

  return { persona, characters, lorebooks, preset, settings };
}
