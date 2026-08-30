"use client";

import {
  readConvHistoryForSend,
  readLocalConversationSettings,
  readPrimaryCharacter,
} from "@/lib/db/client/data/chat/chat";
import { readLocalPersona, readLocalPreset } from "@/lib/db/client/data/rp/rp";
import { NONE_VALUE } from "@/lib/config/constants";
import { chatModelAtom, chatLoadoutAtom, chatStore } from "@/store/chat-store";
import { resolveModelTargetFromStore } from "./resolve-model-target";

// SillyTavern's impersonation prompt, which is the one open-source wording with
// years of RP mileage behind it. The two prohibitions are the load-bearing part:
// without them the model answers AS the character, which is the single most
// reported failure of JanitorAI's equivalent feature.
const IMPERSONATE_PROMPT =
  "[Write your next reply from the point of view of {{user}}, using the chat history so far as a guideline for the writing style of {{user}}. Write 1 reply only in internet RP style. Don't write as {{char}} or system. Don't describe actions of {{char}}.]";

// Whatever is already in the composer steers the reply rather than being
// rewritten literally, so both "be angry" and a half-written paragraph work:
// one is direction, the other is a draft, and the model reads both as guidance.
const DIRECTION_LINE =
  "Additional direction for this reply, follow it closely: {{direction}}";

const MAX_TOKENS = 1024;
const HISTORY_TURNS = 12;

const macro = (text: string, user: string, char: string) =>
  text.replaceAll("{{user}}", user).replaceAll("{{char}}", char);

const partsToText = (parts: { type: string; text?: string }[]) =>
  parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n")
    .trim();

// The model is asked for the USER's turn, so anything opening as the character
// is the model having ignored that entirely. Pasting it would put the
// character's words in the user's mouth, so it is discarded rather than shown.
export class SpokeAsCharacterError extends Error {}

function clean(raw: string, user: string, char: string): string {
  let text = raw.trim();
  // Models routinely echo the speaker label; strip our own, refuse theirs.
  const userLabel = new RegExp(`^${escapeRe(user)}\\s*:\\s*`, "i");
  const charLabel = new RegExp(`^${escapeRe(char)}\\s*:\\s*`, "i");
  if (charLabel.test(text)) throw new SpokeAsCharacterError();
  text = text.replace(userLabel, "").trim();
  // A trailing turn for the other side is the model continuing the scene past
  // the one reply it was asked for; keep only what comes before it.
  const cut = text.search(new RegExp(`\\n\\s*${escapeRe(char)}\\s*:`, "i"));
  if (cut > 0) text = text.slice(0, cut).trim();
  if (!text) throw new SpokeAsCharacterError();
  return text;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function runImpersonate(
  convId: string,
  draft: string,
): Promise<string> {
  const settings = await readLocalConversationSettings(convId);
  const loadout = chatStore.get(chatLoadoutAtom);
  const bound = (id: string | null | undefined) =>
    id && id !== NONE_VALUE ? id : null;

  const personaId = bound(settings?.personaId) ?? bound(loadout.personaId);
  const persona = personaId ? await readLocalPersona(personaId) : null;
  const character = await readPrimaryCharacter(convId);
  const userName = persona?.name || "User";
  const charName = character?.name || "the character";

  const presetId = bound(settings?.presetId) ?? bound(loadout.presetId);
  const preset = presetId ? await readLocalPreset(presetId) : null;
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
    .join("\n\n");

  const history = await readConvHistoryForSend(convId);
  const recent = history.branch.slice(-HISTORY_TURNS).map((m) => {
    const who = m.role === "user" ? userName : charName;
    return `${who}: ${partsToText(m.parts)}`;
  });
  const prompt = [recent.join("\n\n"), `\n${userName}:`].join("\n");

  const modelId = chatStore.get(chatModelAtom);
  if (!modelId) throw new Error("impersonate: no model selected");
  const target = await resolveModelTargetFromStore(modelId);
  // Folded into the user turn rather than passed as systemPrompt: the utility
  // lane renders that as a real system message, and models like glm reject one
  // outright ("System messages are not allowed").
  const res = await target.deps.runUtilityLLM(target.model, {
    systemPrompt: "",
    prompt: `${systemPrompt}\n\n${prompt}`,
    maxOutputTokens: MAX_TOKENS,
  });
  return clean(res.text, userName, charName);
}
