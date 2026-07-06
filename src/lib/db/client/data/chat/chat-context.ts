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
  userId: number | undefined,
  convId: string,
  opts?: { expectBindings?: boolean },
): Promise<ChatContext | undefined> {
  let settings = await readLocalConversationSettings(userId, convId);
  for (let attempt = 0; !settings && attempt < 5; attempt++) {
    await new Promise((r) => setTimeout(r, 40));
    settings = await readLocalConversationSettings(userId, convId);
  }
  if (!settings) return undefined;

  {
    const msgs = await readLocalMessages(userId, convId);
    if (msgs && msgs.length > 0) {
      const tip = walkActiveBranch(msgs).path.at(-1) as
        { branchVars?: string | null } | undefined;
      if (tip?.branchVars != null)
        settings = { ...settings, vars: tip.branchVars };
    }
  }

  let bindings = await readLocalConversationBindings(userId, convId);
  for (
    let attempt = 0;
    opts?.expectBindings &&
    (bindings?.conversationCharacters?.length ?? 0) === 0 &&
    (bindings?.conversationLorebooks?.length ?? 0) === 0 &&
    attempt < 10;
    attempt++
  ) {
    await new Promise((r) => setTimeout(r, 40));
    bindings = await readLocalConversationBindings(userId, convId);
  }

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
