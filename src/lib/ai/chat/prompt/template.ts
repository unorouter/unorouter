export type PromptItemRole = "system" | "user" | "assistant";

export type SlotName =
  | "main" // preset.mainPrompt + web-search/guest fallback
  | "description" // per-character blocks (desc/personality/scenario/examples)
  | "persona" // user persona block
  | "lorebook" // all selected lorebook entries, one role-tagged message each, orderIndex-then-priority sorted
  | "prefill" // trailing assistant priming text, emitted as an assistant message
  | "postHistory" // jailbreak/UJB + preset.postHistory
  | "systemPrompt"; // systemPromptOverride ?? primary.systemPrompt

export type PromptItem =
  | { type: "slot"; slot: SlotName; innerFormat?: string }
  | { type: "plain"; text: string; role: PromptItemRole }
  | { type: "chat"; rangeStart: number; rangeEnd: number | "end" };

export type PromptPart =
  | { kind: "message"; role: PromptItemRole; text: string }
  | { kind: "chatHistory"; rangeStart: number; rangeEnd: number | "end" };

export type SlotBlock = { text: string; role: PromptItemRole };

export type TemplateSlots = Record<SlotName, SlotBlock | SlotBlock[] | null>;

export const CHAT_RANGE_ALL = -1000;

export const DEFAULT_PROMPT_TEMPLATE: PromptItem[] = [
  { type: "slot", slot: "main" },
  { type: "slot", slot: "lorebook" },
  { type: "slot", slot: "description" },
  { type: "slot", slot: "persona" },
  { type: "slot", slot: "systemPrompt" },
  { type: "chat", rangeStart: CHAT_RANGE_ALL, rangeEnd: "end" },
  { type: "slot", slot: "prefill" },
  { type: "slot", slot: "postHistory" },
];

function applyInnerFormat(content: string, innerFormat?: string): string {
  if (!innerFormat) return content;
  return innerFormat.includes("{{slot}}")
    ? innerFormat.replace("{{slot}}", content)
    : innerFormat;
}

export function walkTemplate(
  template: PromptItem[],
  slots: TemplateSlots,
): PromptPart[] {
  const parts: PromptPart[] = [];
  for (const item of template) {
    switch (item.type) {
      case "slot": {
        const slot = slots[item.slot];
        if (!slot) break;
        const blocks = Array.isArray(slot) ? slot : [slot];
        for (const block of blocks) {
          if (!block.text.trim()) continue;
          parts.push({
            kind: "message",
            role: block.role,
            text: applyInnerFormat(block.text, item.innerFormat),
          });
        }
        break;
      }
      case "plain": {
        if (!item.text.trim()) break;
        parts.push({ kind: "message", role: item.role, text: item.text });
        break;
      }
      case "chat": {
        parts.push({
          kind: "chatHistory",
          rangeStart: item.rangeStart,
          rangeEnd: item.rangeEnd,
        });
        break;
      }
    }
  }
  return parts;
}

const LEGACY_LORE_SLOTS = new Set([
  "loreTop",
  "loreBeforeChar",
  "loreAfterChar",
]);

export function parsePromptTemplate(
  raw: string | null | undefined,
): PromptItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const out: PromptItem[] = [];
    let lorebookPlaced = false;
    for (const c of parsed) {
      if (!c || typeof c !== "object") continue;
      const item = c as Record<string, unknown>;
      if (item.type === "slot" && typeof item.slot === "string") {
        const slot = (
          LEGACY_LORE_SLOTS.has(item.slot) ? "lorebook" : item.slot
        ) as SlotName;
        if (slot === "lorebook") {
          if (lorebookPlaced) continue;
          lorebookPlaced = true;
        }
        out.push({
          type: "slot",
          slot,
          innerFormat:
            typeof item.innerFormat === "string" ? item.innerFormat : undefined,
        });
      } else if (item.type === "plain" && typeof item.text === "string") {
        const role =
          item.role === "user" || item.role === "assistant"
            ? item.role
            : "system";
        out.push({ type: "plain", text: item.text, role });
      } else if (item.type === "chat") {
        const rangeStart =
          typeof item.rangeStart === "number"
            ? item.rangeStart
            : CHAT_RANGE_ALL;
        const rangeEnd =
          item.rangeEnd === "end" || typeof item.rangeEnd === "number"
            ? item.rangeEnd
            : "end";
        out.push({ type: "chat", rangeStart, rangeEnd });
      }
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

export function resolveChatRange(
  rangeStart: number,
  rangeEnd: number | "end",
  length: number,
): { start: number; end: number } {
  let start = rangeStart;
  let end = rangeEnd === "end" ? length : rangeEnd;
  if (start === CHAT_RANGE_ALL) {
    return { start: 0, end: length };
  }
  if (start < 0) start = Math.max(0, length + start);
  if (typeof end === "number" && end < 0) end = Math.max(0, length + end);
  if (start >= end) return { start: 0, end: 0 };
  return { start, end };
}
