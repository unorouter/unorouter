// RisuAI-style prompt template: user-orderable cards walked into the prompt. Cards are named SLOTS or LITERAL text, plus one chat card for history.

export type PromptItemRole = "system" | "user" | "assistant";

// Named content slots the assembler computes. A slot card emits its field; empty/missing slots are skipped.
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
  // Literal block inserted in place with a chosen role.
  | { type: "plain"; text: string; role: PromptItemRole }
  // Chat-history marker. range slices history: negative counts from the end, "end" is full length, ALL (-1000) is all.
  | { type: "chat"; rangeStart: number; rangeEnd: number | "end" };

// One emitted prompt part: a role message or the history placeholder the stream service expands into messages.
export type PromptPart =
  | { kind: "message"; role: PromptItemRole; text: string }
  | { kind: "chatHistory"; rangeStart: number; rangeEnd: number | "end" };

// One emittable block: macro-expanded text plus the role to emit it as.
export type SlotBlock = { text: string; role: PromptItemRole };

// Content for each slot, pre-built by the assembler. The lorebook slot carries an ARRAY (one role-tagged message per entry); the rest carry one block.
export type TemplateSlots = Record<SlotName, SlotBlock | SlotBlock[] | null>;

export const CHAT_RANGE_ALL = -1000;

// Fixed assembly order, used when a preset has no promptTemplate. Tail: chat history, prefill, then post-history end inject.
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

// Apply an innerFormat wrapper: replace {{slot}} with the content. No {{slot}} token means the format replaces entirely.
function applyInnerFormat(content: string, innerFormat?: string): string {
  if (!innerFormat) return content;
  return innerFormat.includes("{{slot}}")
    ? innerFormat.replace("{{slot}}", content)
    : innerFormat;
}

// Walk a template into ordered prompt parts. Empty slots and blank text blocks are dropped; the chat card becomes a chatHistory placeholder.
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
        // The lorebook slot emits an array: one role-tagged message per entry, kept distinct so mixed roles survive.
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

// Legacy single-slot lorebook positions collapse onto the one `lorebook` slot.
const LEGACY_LORE_SLOTS = new Set(["loreTop", "loreBeforeChar", "loreAfterChar"]);

// Parse a stored promptTemplate JSON string. null (use default) on absent/invalid input. Unknown card types are dropped.
export function parsePromptTemplate(
  raw: string | null | undefined,
): PromptItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const out: PromptItem[] = [];
    // Old presets carried three lore slots; map each to `lorebook` and keep only the FIRST so the single slot isn't emitted thrice.
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
      // unknown types (cache/memory/chatML/etc.) dropped
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

// Resolve a chat card's [start, end) bounds against msgs. Negative counts from the end, ALL is the whole history.
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
