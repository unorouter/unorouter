"use client";

import type { LoadedConvContext } from "@/lib/types";
import { extraPersonaIds } from "@/lib/db/conversation-settings";
import {
  readLocalConversationBindings,
  readLocalConversationSettings,
} from "@/lib/db/client/data/chat/chat";
import {
  characterStore,
  readLocalLorebookBundle,
  personaStore,
  presetStore,
} from "@/lib/db/client/data/rp/rp";

export async function buildChatContextFromLocalDb(
  convId: string,
  tipVars: string | null,
): Promise<LoadedConvContext | undefined> {
  const stored = await readLocalConversationSettings(convId);
  if (!stored) return undefined;
  const settings = tipVars != null ? { ...stored, vars: tipVars } : stored;

  const bindings = await readLocalConversationBindings(convId);

  const charBindings = bindings?.conversationCharacters ?? [];
  const lorebookIds = (bindings?.conversationLorebooks ?? []).map(
    (b) => b.lorebookId,
  );

  const [characterRows, lorebookRows, personaRows, preset] = await Promise.all([
    Promise.all(
      charBindings.map(async (b) => ({
        binding: b,
        character: await characterStore.get(b.characterId),
      })),
    ),
    Promise.all(lorebookIds.map((id) => readLocalLorebookBundle(id))),
    personaStore.list(),
    settings.presetId ? presetStore.get(settings.presetId) : null,
  ]);
  const boundCharacters = characterRows.flatMap((c, i) =>
    c.character && c.binding.isActive !== false
      ? [
          {
            binding: { ...c.binding, orderIndex: c.binding.orderIndex ?? i },
            character: c.character,
          },
        ]
      : [],
  );
  const bundles = lorebookRows.filter((l) => l != null);
  const personas = personaRows ?? [];
  const persona = personas.find((p) => p.id === settings.personaId);
  const extraPersonas = extraPersonaIds(settings).flatMap((id) => {
    const p = personas.find((row) => row.id === id);
    return p && p.id !== persona?.id ? [p] : [];
  });

  return {
    settings,
    boundCharacters,
    persona,
    extraPersonas,
    personaNames: Object.fromEntries(personas.map((p) => [p.id, p.name])),
    preset: preset ?? undefined,
    lbRows: bundles.map((l) => l.lorebook),
    lbEntries: bundles.flatMap((l) =>
      l.entries.filter((e) => e.enabled !== false),
    ),
  };
}
