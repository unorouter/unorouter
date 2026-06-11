// RisuAI-style prompt template: user-orderable typed cards walked into the
// final prompt. Cards are named SLOTS (pre-built content) or LITERAL text
// blocks, plus one `chat` card marking where history splices in.

export type PromptItemRole = "system" | "user" | "assistant";

// Named content slots the assembler computes. A `slot` card emits the matching
// field; an empty/missing slot is skipped.
export type SlotName =
  | "main" // preset.mainPrompt + web-search/guest fallback
  | "description" // per-character blocks (desc/personality/scenario/examples)
  | "persona" // user persona block
  | "loreTop" // lorebook entries position=top
  | "loreBeforeChar" // position=before_char
  | "loreAfterChar" // position=after_char
  | "prefill" // trailing assistant priming text, emitted as an assistant message
  | "postHistory" // jailbreak/UJB + preset.postHistory + lore position=bottom (end inject)
  | "systemPrompt"; // systemPromptOverride ?? primary.systemPrompt

export type PromptItem =
  | { type: "slot"; slot: SlotName; innerFormat?: string }
  // Literal block inserted in place with a chosen role.
  | { type: "plain"; text: string; role: PromptItemRole }
  // Chat-history marker. range slices the history: negative counts from the
  // end, "end" is the full length, ALL (-1000) is the whole history.
  | { type: "chat"; rangeStart: number; rangeEnd: number | "end" };

// One emitted prompt part: either a role message or the history placeholder
// (which the stream service expands into the conversation messages).
export type PromptPart =
  | { kind: "message"; role: PromptItemRole; text: string }
  | { kind: "chatHistory"; rangeStart: number; rangeEnd: number | "end" };

// Content for each slot, pre-built by the assembler. Each is a finished string
// (already macro-expanded) plus the role it should be emitted as.
export type TemplateSlots = Record<
  SlotName,
  { text: string; role: PromptItemRole } | null
>;

export const CHAT_RANGE_ALL = -1000;

// Fixed assembly order as a template; used when a preset has no explicit
// promptTemplate, so default behavior is unchanged.
// Standard tail ordering: chat history, then the assistant prefill, then the
// post-history "end inject" dead last. Users can reorder via a stored template.
export const DEFAULT_PROMPT_TEMPLATE: PromptItem[] = [
  { type: "slot", slot: "main" },
  { type: "slot", slot: "loreTop" },
  { type: "slot", slot: "loreBeforeChar" },
  { type: "slot", slot: "description" },
  { type: "slot", slot: "persona" },
  { type: "slot", slot: "loreAfterChar" },
  { type: "slot", slot: "systemPrompt" },
  { type: "chat", rangeStart: CHAT_RANGE_ALL, rangeEnd: "end" },
  { type: "slot", slot: "prefill" },
  { type: "slot", slot: "postHistory" },
];

// Apply an innerFormat wrapper: replace {{slot}} with the content (RisuAI
// index.svelte.ts:1217). No {{slot}} token means the format replaces entirely.
function applyInnerFormat(content: string, innerFormat?: string): string {
  if (!innerFormat) return content;
  return innerFormat.includes("{{slot}}")
    ? innerFormat.replace("{{slot}}", content)
    : innerFormat;
}

// Walk a template into ordered prompt parts. Empty slots and zero-length text
// blocks are dropped; the chat card becomes a chatHistory placeholder.
export function walkTemplate(
  template: PromptItem[],
  slots: TemplateSlots,
): PromptPart[] {
  const parts: PromptPart[] = [];
  for (const item of template) {
    switch (item.type) {
      case "slot": {
        const slot = slots[item.slot];
        if (!slot || !slot.text.trim()) break;
        parts.push({
          kind: "message",
          role: slot.role,
          text: applyInnerFormat(slot.text, item.innerFormat),
        });
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

// Parse a stored promptTemplate JSON string. Returns null (-> use default) on
// absent/invalid input or an unrecognized shape. Unknown card types are dropped.
export function parsePromptTemplate(
  raw: string | null | undefined,
): PromptItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const out: PromptItem[] = [];
    for (const c of parsed) {
      if (!c || typeof c !== "object") continue;
      const item = c as Record<string, unknown>;
      if (item.type === "slot" && typeof item.slot === "string") {
        out.push({
          type: "slot",
          slot: item.slot as SlotName,
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

// Resolve a chat card's [start, end) bounds against a history of `length` msgs.
// Mirrors RisuAI index.svelte.ts:1324-1346 (negative = from end, ALL = whole).
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
