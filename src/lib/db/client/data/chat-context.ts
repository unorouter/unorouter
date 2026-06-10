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
  // First message of a brand-new conversation: the transport body can build
  // here in the same tick initialize() writes the conv row, so the first read
  // may miss it (OPFS write-visibility lag). Retry briefly before giving up,
  // else the first message silently ships with no preset/persona/lorebook.
  let settings = await readLocalConversationSettings(userId, convId);
  for (let attempt = 0; !settings && attempt < 5; attempt++) {
    await new Promise((r) => setTimeout(r, 40));
    settings = await readLocalConversationSettings(userId, convId);
  }
  if (!settings) return undefined;

  const bindings = await readLocalConversationBindings(userId, convId);

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
  // Disabled entries never inject (Turso path filters enabled=true in SQL);
  // dropping them here keeps parity AND off the wire.
  const lorebooks = lorebookRows
    .filter((l) => l != null)
    .map((l) => ({
      ...l,
      entries: l.entries.filter(
        (e) => (e as { enabled?: boolean | null }).enabled !== false,
      ),
    }));

  return { persona, characters, lorebooks, preset, settings };
}
