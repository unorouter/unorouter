"use client";

import {
  readConvHistoryForSend,
  readLocalConversationSettings,
  readPrimaryCharacter,
} from "@/lib/db/client/data/chat/chat";
import {
  characterStore,
  personaStore,
  presetStore,
} from "@/lib/db/client/data/rp/rp";
import { NONE_VALUE } from "@/lib/config/constants";
import { textOf } from "@/lib/ai/chat/pipeline/transforms";
import { escapeRegex } from "@/lib/utils/base";
import { MAX_TEXT_LEN } from "@/lib/validation/chat";
import {
  chatGroupAtom,
  chatModelAtom,
  chatLoadoutAtom,
  chatStore,
} from "@/store/chat-store";
import { resolveModelTarget } from "@/components/pages/sidebar/chat/runtime/transport/resolve-model-target";

// SillyTavern's wording. Without the two prohibitions the model answers AS the
// character, the most reported failure of JanitorAI's equivalent.
const IMPERSONATE_PROMPT =
  "[Write your next reply from the point of view of {{user}}, using the chat history so far as a guideline for the writing style of {{user}}. Write 1 reply only in internet RP style. Don't write as {{char}} or system. Don't describe actions of {{char}}.]";

const DIRECTION_LINE =
  "Additional direction for this reply, follow it closely: {{direction}}";

const HISTORY_TURNS = 12;
// Room for the system block, the labels and the trailing turn marker, so the
// assembled prompt lands under the route's own limit rather than on it.
const PROMPT_HEADROOM = 4_000;

const macro = (text: string, user: string, char: string) =>
  text.replaceAll("{{user}}", user).replaceAll("{{char}}", char);

export class SpokeAsCharacterError extends Error {}

function clean(raw: string, user: string, char: string): string {
  let text = raw.trim();
  // Models routinely echo the speaker label; strip our own, refuse theirs.
  const userLabel = new RegExp(`^${escapeRegex(user)}\\s*:\\s*`, "i");
  const charLabel = new RegExp(`^${escapeRegex(char)}\\s*:\\s*`, "i");
  if (charLabel.test(text)) throw new SpokeAsCharacterError();
  text = text.replace(userLabel, "").trim();
  // A trailing turn for the other side is the model continuing the scene past
  // the one reply it was asked for; keep only what comes before it.
  const cut = text.search(new RegExp(`\\n\\s*${escapeRegex(char)}\\s*:`, "i"));
  if (cut > 0) text = text.slice(0, cut).trim();
  if (!text) throw new SpokeAsCharacterError();
  return text;
}

async function firstLoadoutCharacter(ids: string[]) {
  for (const id of ids) {
    const row = await characterStore.get(id);
    if (row) return row;
  }
  return null;
}

export async function runImpersonate(
  convId: string | null,
  draft: string,
): Promise<string> {
  const settings = convId ? await readLocalConversationSettings(convId) : null;
  const loadout = chatStore.get(chatLoadoutAtom);
  const bound = (id: string | null | undefined) =>
    id && id !== NONE_VALUE ? id : null;

  const personaId = bound(settings?.personaId) ?? bound(loadout.personaId);
  const persona = personaId ? await personaStore.get(personaId) : null;
  const character = convId
    ? await readPrimaryCharacter(convId)
    : await firstLoadoutCharacter(loadout.characterIds);
  const userName = persona?.name || "User";
  const charName = character?.name || "the character";

  const presetId = bound(settings?.presetId) ?? bound(loadout.presetId);
  const preset = presetId ? await presetStore.get(presetId) : null;
  const custom = preset?.impersonatePrompt?.trim();
  const direction = draft.trim();
  const base = [custom || IMPERSONATE_PROMPT, direction && DIRECTION_LINE]
    .filter(Boolean)
    .join("\n")
    .replaceAll("{{direction}}", direction);

  const personaBlock = [
    persona?.description?.trim(),
    persona?.personality?.trim(),
  ]
    .filter(Boolean)
    .join("\n");
  const systemPrompt = [
    macro(base, userName, charName),
    personaBlock && `# ${userName}\n${personaBlock}`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, MAX_TEXT_LEN - PROMPT_HEADROOM);

  const history = convId ? await readConvHistoryForSend(convId) : null;
  const budget = MAX_TEXT_LEN - systemPrompt.length - PROMPT_HEADROOM;
  const recent: string[] = [];
  let used = 0;
  for (const m of (history?.branch ?? []).slice(-HISTORY_TURNS).reverse()) {
    const who = m.role === "user" ? userName : charName;
    const line = `${who}: ${textOf(m.parts).trim()}`.slice(-budget);
    if (recent.length > 0 && used + line.length > budget) break;
    recent.unshift(line);
    used += line.length;
  }
  const prompt = [recent.join("\n\n"), `\n${userName}:`].join("\n");

  const modelId = chatStore.get(chatModelAtom);
  if (!modelId) throw new Error("impersonate: no model selected");
  const target = await resolveModelTarget(modelId);
  // Folded into the user turn rather than passed as systemPrompt: the utility
  // lane renders that as a real system message, and models like glm reject one
  // outright ("System messages are not allowed").
  const res = await target.deps.runUtilityLLM(target.model, {
    systemPrompt: "",
    prompt: `${systemPrompt}\n\n${prompt}`,
    group: chatStore.get(chatGroupAtom),
  });
  return clean(res.text, userName, charName);
}
