import {
  CHAT_RANGE_ALL,
  type PromptItem,
  type PromptItemRole,
} from "@/lib/ai/chat/prompt/template";
import { rec } from "@/lib/utils/base";

// SillyTavern and RisuAI both export a preset as a bag of their own field
// names, so each needs its own translation into ours. Neither carries a name:
// the file is the name in both products.

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;

// Risu writes -1000 for "unset" on every sampler, and SillyTavern leaves a
// disabled sampler at 0, which is a real value for some of them.
const num = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
};

// Rendering the history or the lorebook twice is the one mistake a translated
// template can make that the user cannot see until a reply comes back wrong:
// SillyTavern splits world info into a before and an after marker, and Risu
// ships two overlapping chat ranges.
function pushOnce(out: PromptItem[], item: PromptItem): void {
  if (item.type === "chat" && out.some((i) => i.type === "chat")) return;
  if (
    item.type === "slot" &&
    item.slot === "lorebook" &&
    out.some((i) => i.type === "slot" && i.slot === "lorebook")
  )
    return;
  out.push(item);
}

type Mapped = {
  name: string;
  promptTemplate: string | null;
  fields: Record<string, unknown>;
};

const ST_MARKER_SLOTS: Record<string, PromptItem | null> = {
  charDescription: { type: "slot", slot: "description" },
  personaDescription: { type: "slot", slot: "persona" },
  worldInfoBefore: { type: "slot", slot: "lorebook" },
  worldInfoAfter: { type: "slot", slot: "lorebook" },
  chatHistory: { type: "chat", rangeStart: CHAT_RANGE_ALL, rangeEnd: "end" },
  // Ours folds personality, scenario and examples into the character block, so
  // a separate marker for one of them would render it a second time.
  charPersonality: null,
  scenario: null,
  dialogueExamples: null,
};

// Risu says bot where we say assistant; anything else we do not model belongs
// to the system turn, which is where both products put an unlabelled block.
const toRole = (raw: unknown): PromptItemRole => {
  const role = str(raw);
  if (role === "user") return "user";
  if (role === "assistant" || role === "bot") return "assistant";
  return "system";
};

export function isSillyTavernPreset(data: Record<string, unknown>): boolean {
  return Array.isArray(data.prompts) || Array.isArray(data.prompt_order);
}

export function mapSillyTavernPreset(
  data: Record<string, unknown>,
  fallbackName: string,
): Mapped {
  const byId = new Map<string, Record<string, unknown>>();
  for (const entry of Array.isArray(data.prompts) ? data.prompts : []) {
    const p = rec(entry);
    const id = p && str(p.identifier);
    if (p && id) byId.set(id, p);
  }

  // prompt_order is keyed by character; 100001 is SillyTavern's placeholder for
  // "no character", which is the order the preset ships with.
  const orders = Array.isArray(data.prompt_order) ? data.prompt_order : [];
  const chosen =
    orders.map(rec).find((o) => o?.character_id === 100001) ??
    orders.map(rec).find((o) => Array.isArray(o?.order));
  const order = Array.isArray(chosen?.order) ? chosen.order : [];

  const template: PromptItem[] = [];
  for (const slotEntry of order) {
    const o = rec(slotEntry);
    const id = o && str(o.identifier);
    if (!o || !id || o.enabled === false) continue;
    const prompt = byId.get(id);
    if (!prompt) continue;
    if (prompt.marker === "True" || prompt.marker === true) {
      const marker = ST_MARKER_SLOTS[id];
      if (marker) pushOnce(template, marker);
      continue;
    }
    const text = str(prompt.content);
    if (!text) continue;
    template.push({ type: "plain", text, role: toRole(prompt.role) });
  }

  return {
    name: str(data.name) ?? fallbackName,
    promptTemplate: template.length > 0 ? JSON.stringify(template) : null,
    fields: {
      temperature: num(data.temperature, 0, 4),
      topP: num(data.top_p, 0, 1),
      topK: num(data.top_k, 0, 1000),
      minP: num(data.min_p, 0, 1),
      topA: num(data.top_a, 0, 1),
      frequencyPenalty: num(data.frequency_penalty, -2, 2),
      presencePenalty: num(data.presence_penalty, -2, 2),
      repetitionPenalty: num(data.repetition_penalty, 0, 2),
      maxTokens: num(data.openai_max_tokens, 1, 1_000_000),
      impersonatePrompt: str(data.impersonation_prompt),
      prefill: str(data.assistant_prefill),
      continuePrompt: str(data.continue_nudge_prompt),
      streamingEnabled:
        typeof data.stream_openai === "boolean" ? data.stream_openai : null,
    },
  };
}

// Risu's own slots line up with ours one for one, including innerFormat.
// authornote and memory have no equivalent here and are dropped rather than
// rendered as empty blocks.
const RISU_SLOTS: Record<string, PromptItem["type"] | null> = {
  description: "slot",
  persona: "slot",
  lorebook: "slot",
  authornote: null,
  memory: null,
};

const RISU_UNSET = -1000;

const risuNum = (v: unknown, min: number, max: number): number | null =>
  v === RISU_UNSET ? null : num(v, min, max);

export function isRisuPreset(data: Record<string, unknown>): boolean {
  return (
    Array.isArray(data.promptTemplate) ||
    typeof data.maxResponse === "number" ||
    typeof data.presetVersion === "number"
  );
}

export function mapRisuPreset(
  data: Record<string, unknown>,
  fallbackName: string,
): Mapped {
  const template: PromptItem[] = [];
  for (const entry of Array.isArray(data.promptTemplate)
    ? data.promptTemplate
    : []) {
    const item = rec(entry);
    const type = item && str(item.type);
    if (!item || !type) continue;
    if (type === "plain") {
      const text = str(item.text);
      if (!text) continue;
      template.push({ type: "plain", text, role: toRole(item.role) });
      continue;
    }
    if (type === "chat") {
      pushOnce(template, {
        type: "chat",
        rangeStart: num(item.rangeStart, -100_000, 100_000) ?? CHAT_RANGE_ALL,
        rangeEnd:
          item.rangeEnd === "end"
            ? "end"
            : (num(item.rangeEnd, -100_000, 100_000) ?? "end"),
      });
      continue;
    }
    if (type in RISU_SLOTS) {
      if (RISU_SLOTS[type] === null) continue;
      const innerFormat = str(item.innerFormat);
      pushOnce(template, {
        type: "slot",
        slot:
          type === "description"
            ? "description"
            : type === "persona"
              ? "persona"
              : "lorebook",
        ...(innerFormat ? { innerFormat } : {}),
      });
    }
  }

  return {
    name: str(data.name) ?? fallbackName,
    promptTemplate: template.length > 0 ? JSON.stringify(template) : null,
    fields: {
      // Risu keeps temperature as a percentage of its own scale.
      temperature:
        data.temperature === RISU_UNSET || typeof data.temperature !== "number"
          ? null
          : num(data.temperature / 100, 0, 4),
      topP: risuNum(data.top_p, 0, 1),
      topK: risuNum(data.top_k, 0, 1000),
      minP: risuNum(data.min_p, 0, 1),
      topA: risuNum(data.top_a, 0, 1),
      frequencyPenalty: risuNum(data.frequencyPenalty, -2, 2),
      presencePenalty: risuNum(data.PresensePenalty, -2, 2),
      repetitionPenalty: risuNum(data.repetition_penalty, 0, 2),
      maxTokens: risuNum(data.maxResponse, 1, 1_000_000),
      mainPrompt: str(data.mainPrompt),
      prefill: str(data.prefill),
    },
  };
}
