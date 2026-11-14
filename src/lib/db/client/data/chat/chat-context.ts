"use client";

import type { ChatContext } from "@/lib/validation/chat";
import { walkActiveBranch } from "@/lib/ai/chat/messages";
import {
  readLocalConversationBindings,
  readLocalConversationSettings,
  readLocalMessages,
} from "@/lib/db/client/data/chat/chat";
import {
  readLocalCharacter,
  readLocalLorebookBundle,
  readLocalPersona,
  readLocalPreset,
} from "@/lib/db/client/data/rp/rp";

export async function buildChatContextFromLocalDb(
  convId: string,
): Promise<ChatContext | undefined> {
  let settings = await readLocalConversationSettings(convId);
  if (!settings) return undefined;

  {
    const msgs = await readLocalMessages(convId);
    if (msgs && msgs.length > 0) {
      const tip = walkActiveBranch(msgs).path.at(-1);
      if (tip?.branchVars != null)
        settings = { ...settings, vars: tip.branchVars };
    }
  }

  const bindings = await readLocalConversationBindings(convId);

  const charBindings = bindings?.conversationCharacters ?? [];
  const lorebookIds = (bindings?.conversationLorebooks ?? []).map(
    (b) => b.lorebookId,
  );

  const [characterRows, lorebookRows, persona, preset] = await Promise.all([
    Promise.all(
      charBindings.map(async (b) => ({
        binding: b,
        character: await readLocalCharacter(b.characterId),
      })),
    ),
    Promise.all(lorebookIds.map((id) => readLocalLorebookBundle(id))),
    settings.personaId
      ? readLocalPersona(settings.personaId)
      : Promise.resolve(null),
    settings.presetId
      ? readLocalPreset(settings.presetId)
      : Promise.resolve(null),
  ]);
  const characters = characterRows
    .filter((c) => c.character != null)
    .map((c) => ({ binding: c.binding, character: c.character! }));
  const lorebooks = lorebookRows
    .filter((l) => l != null)
    .map((l) => ({
      ...l,
      entries: l.entries.filter((e) => e.enabled !== false),
    }));

  return { persona, characters, lorebooks, preset, settings };
}
