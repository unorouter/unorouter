"use client";

import { readLocalJsPlugins } from "@/lib/db/client/data/rp/js-plugins";
import { readLocalPreset } from "@/lib/db/client/data/rp/rp";
import type { CrashLoadout } from "@/lib/utils/chat-debug-log";
import {
  chatLoadoutAtom,
  chatModelAtom,
  chatStore,
  convIdAtom,
} from "@/store/chat-store";

// Registration is a plain call in the script body, so a substring match names
// the hooks without executing anything. The script itself is never captured.
const PLUGIN_HOOKS = [
  "display",
  "editRequest",
  "editOutput",
  "editInput",
  "editProcess",
] as const;

// Read AFTER a crash, never on the render path. The message text alone does not
// reproduce a render bug: what built it (preset, characters, lorebooks, and the
// plugins that rewrote it on the way to the parser) is the other half.
export async function collectCrashLoadout(): Promise<CrashLoadout> {
  const loadout = chatStore.get(chatLoadoutAtom);
  const presetId = loadout.presetId ?? null;
  let presetName: string | null = null;
  let plugins: CrashLoadout["plugins"] = [];
  try {
    if (presetId) presetName = (await readLocalPreset(presetId))?.name ?? null;
    plugins = ((await readLocalJsPlugins()) ?? []).map((p) => ({
      name: p.name,
      kind: p.kind,
      enabled: p.enabled,
      hooks: PLUGIN_HOOKS.filter((h) => p.script.includes(h)),
    }));
  } catch {}
  return {
    convId: chatStore.get(convIdAtom),
    model: chatStore.get(chatModelAtom),
    presetId,
    presetName,
    personaId: loadout.personaId ?? null,
    characterIds: loadout.characterIds ?? [],
    lorebookIds: loadout.lorebookIds ?? [],
    plugins,
  };
}
