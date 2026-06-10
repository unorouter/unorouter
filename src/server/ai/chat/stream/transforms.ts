import { getDb } from "@/lib/db/server/client";
import { media } from "@/lib/db/schema";
import { serverEnv } from "@/server/env";
import type { convertToModelMessages } from "ai";
import { inArray } from "drizzle-orm";
import { encode } from "gpt-tokenizer";
import { runRegexScripts, type RegexScript } from "@/lib/ai/chat/regex-scripts";
import type {
  AssembledSystem,
  DepthInjection,
} from "../augmentation/prompt-assembler.service";
import { expandMacros } from "../augmentation/macros";

export type StreamMessages = Parameters<typeof convertToModelMessages>[0];

// Bare role+text message in the ai-sdk parts shape.
export function mkMsg(
  role: "system" | "user" | "assistant",
  text: string,
): StreamMessages[number] {
  return { role, parts: [{ type: "text", text }] } as StreamMessages[number];
}

// All text-part content of a message, newline-joined ("" when none).
function textOf(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => (p as { text: string }).text)
    .join("\n");
}

// Map a function over a message's text parts, leaving other parts untouched.
// Identity-preserving: returns the ORIGINAL message when no text changed, so
// per-turn whole-history passes (macro expansion, regex scripts) don't churn
// allocations for the common no-op case.
function mapTextParts(
  m: StreamMessages[number],
  fn: (text: string) => string,
): StreamMessages[number] {
  if (!Array.isArray(m.parts)) return m;
  let changed = false;
  const parts = m.parts.map((p) => {
    if (p.type !== "text" || typeof p.text !== "string") return p;
    const next = fn(p.text);
    if (next === p.text) return p;
    changed = true;
    return { ...p, text: next };
  });
  return changed ? ({ ...m, parts } as StreamMessages[number]) : m;
}

type PdfFilePart = {
  type: "file";
  mediaType: "application/pdf";
  url: string;
  filename?: string;
};

function isPdfFilePart(part: unknown): part is PdfFilePart {
  const p = part as Partial<PdfFilePart>;
  return (
    p?.type === "file" &&
    p.mediaType === "application/pdf" &&
    typeof p.url === "string"
  );
}

export async function inlinePdfText(
  messages: StreamMessages,
): Promise<StreamMessages> {
  const r2Base = serverEnv.r2PublicUrl;
  if (!r2Base) return messages;
  const urlToKey = (url: string) => url.slice(r2Base.length + 1);

  const pdfUrls = new Set<string>();
  for (const m of messages) {
    if (m.role !== "user" || !Array.isArray(m.parts)) continue;
    for (const part of m.parts) {
      if (isPdfFilePart(part) && part.url.startsWith(r2Base)) {
        pdfUrls.add(part.url);
      }
    }
  }
  if (pdfUrls.size === 0) return messages;

  const rows = await getDb()
    .select({ r2Key: media.r2Key, extractedText: media.extractedText })
    .from(media)
    .where(inArray(media.r2Key, [...pdfUrls].map(urlToKey)));
  const textByUrl = new Map<string, string | null>();
  for (const row of rows) {
    const url = `${r2Base}/${row.r2Key}`;
    // null means row exists but extraction never produced text. We still want
    // to substitute a placeholder so the stream continues instead of throwing.
    textByUrl.set(url, row.extractedText ?? null);
  }
  if (textByUrl.size === 0) return messages;

  return messages.map((m) => {
    if (m.role !== "user" || !Array.isArray(m.parts)) return m;
    const parts = m.parts.flatMap((part) => {
      if (!isPdfFilePart(part)) return [part];
      const text = textByUrl.get(part.url);
      if (text === undefined) return [part];
      const name = part.filename ?? "document.pdf";
      const body =
        text != null
          ? `[Attached PDF "${name}":\n${text}\n]`
          : `[Attached PDF "${name}": extraction unavailable]`;
      return [{ type: "text" as const, text: body }];
    });
    return { ...m, parts };
  });
}

export function extractLastUserText(messages: StreamMessages): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    if (Array.isArray(msg.parts)) {
      for (const part of msg.parts) {
        if (
          part.type === "text" &&
          typeof part.text === "string" &&
          part.text.trim()
        ) {
          return part.text.trim();
        }
      }
    }
  }
  return null;
}

// SillyTavern depth: counts back from end (0=after last, 1=before last). First-passed wins ties.
export function spliceDepthInjections(
  messages: StreamMessages,
  injections: DepthInjection[],
): StreamMessages {
  if (injections.length === 0) return messages;
  const withIdx = injections
    .map((inj) => {
      const idx = Math.max(0, messages.length - inj.depth);
      return { idx, inj };
    })
    .sort((a, b) => b.idx - a.idx);
  const out = messages.slice();
  for (const { idx, inj } of withIdx) {
    out.splice(idx, 0, mkMsg(inj.role ?? "system", inj.text));
  }
  return out;
}

export function expandMessageMacros(
  messages: StreamMessages,
  scope: AssembledSystem["vars"],
): StreamMessages {
  return messages.map((m) => mapTextParts(m, (t) => expandMacros(t, scope)));
}

export function appendPrefill(
  messages: StreamMessages,
  prefill: string,
): StreamMessages {
  return [...messages, mkMsg("assistant", prefill)];
}

// Gemini/some GLM reject mid-conv system role; top-level `system` is unaffected.
export function stripSystemRole(messages: StreamMessages): StreamMessages {
  return messages.map((m) =>
    m.role === "system"
      ? ({
          ...mapTextParts(m, (t) => `system: ${t}`),
          role: "user",
        } as StreamMessages[number])
      : m,
  );
}

// Reasoning is OUTPUT-only. GLM (and others) emit a `reasoning`/`reasoning_content`
// part on their assistant replies; echoing it back as INPUT on the next turn makes
// the upstream reject it ("property 'reasoning_content' is unsupported"). Strip
// every reasoning part from history before send. A message left with no parts is
// handled by dropEmptyMessages; a reasoning-only assistant turn becomes empty and
// is dropped (its visible text, if any, survives as a separate text part).
// Some models emit reasoning INLINE in the text content instead of a separate
// reasoning part (GLM via OpenAI-compat, R1 distills). RisuAI strips these from
// history text (openAI/requests.ts think-tag extraction); without it the tokens
// re-enter context every turn and accelerate drift.
const INLINE_THINK_RE = /<(think|thinking|Thoughts)>[\s\S]*?<\/\1>\s*/g;

function stripInlineThink(text: string): string {
  return text.replace(INLINE_THINK_RE, "");
}

export function stripReasoningParts(messages: StreamMessages): StreamMessages {
  return messages.map((m) => {
    if (!Array.isArray(m.parts)) return m;
    let changed = false;
    const parts = m.parts
      .filter((p) => {
        if (p.type === "reasoning") {
          changed = true;
          return false;
        }
        return true;
      })
      .map((p) => {
        if (
          m.role !== "assistant" ||
          p.type !== "text" ||
          typeof p.text !== "string"
        ) {
          return p;
        }
        const stripped = stripInlineThink(p.text);
        if (stripped === p.text) return p;
        changed = true;
        return { ...p, text: stripped };
      })
      .filter((p) => !(p.type === "text" && p.text === ""));
    if (!changed) return m;
    return { ...m, parts } as StreamMessages[number];
  });
}

// GLM/some Anthropic require strict user/assistant alternation.
export function mergeAlternateRoles(messages: StreamMessages): StreamMessages {
  if (messages.length < 2) return messages;
  const out: StreamMessages = [];
  for (const m of messages) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.role === m.role &&
      Array.isArray(prev.parts) &&
      Array.isArray(m.parts)
    ) {
      // Join with a newline between blocks (RisuAI `content += '\n' + content`)
      // so merged same-role turns don't run together. Only insert the separator
      // when text borders text; media parts concatenate untouched.
      const prevLast = prev.parts[prev.parts.length - 1];
      const mFirst = m.parts[0];
      const needsNewline = prevLast?.type === "text" && mFirst?.type === "text";
      out[out.length - 1] = {
        ...prev,
        parts: needsNewline
          ? [
              ...prev.parts.slice(0, -1),
              { ...prevLast, text: `${prevLast.text}\n${mFirst.text}` },
              ...m.parts.slice(1),
            ]
          : [...prev.parts, ...m.parts],
      } as StreamMessages[number];
    } else {
      out.push(m);
    }
  }
  return out;
}

// Drop messages whose every part is empty/whitespace text and that carry no
// non-text part (RisuAI parity: pushPrompts skips empties + openAI/requests.ts
// filters `content.trim() !== '' || multimodals`). Keeps media/file parts.
export function dropEmptyMessages(messages: StreamMessages): StreamMessages {
  return messages.filter((m) => {
    if (!Array.isArray(m.parts)) return true;
    return m.parts.some((p) =>
      p.type === "text" ? (p.text ?? "").trim() !== "" : true,
    );
  });
}

// Anthropic and Gemini reject convs that start with assistant or system role.
// Stub is a bare space (RisuAI request.ts:421), not visible text, so it does
// not pollute the prompt the model reads.
export function prependUserStub(messages: StreamMessages): StreamMessages {
  if (messages.length === 0) return messages;
  if (messages[0].role === "user") return messages;
  return [mkMsg("user", " "), ...messages];
}

// GLM/DeepSeek/Kimi reject a request whose LAST message is not user ("last role
// must be user"). When the conversation ends on an assistant turn (the model's
// prior reply) and nothing user-role follows (e.g. an empty postHistory and no
// prefill), append a bare-space user stub so strict-alternation upstreams
// accept the request. Mirror of prependUserStub for the trailing edge. NEVER
// call this when a prefill is present: a prefill is an INTENTIONAL trailing
// assistant turn (jailbreak surface) and must remain last.
export function appendUserStub(messages: StreamMessages): StreamMessages {
  if (messages.length === 0) return messages;
  if (messages[messages.length - 1].role === "user") return messages;
  return [...messages, mkMsg("user", " ")];
}

export const GEMINI_SAFETY_OFF = [
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
  "HARM_CATEGORY_CIVIC_INTEGRITY",
].map((category) => ({ category, threshold: "OFF" as const }));

export function collectRecentUserTexts(
  messages: StreamMessages,
  limit = 32,
): string[] {
  const out: string[] = [];
  for (let i = messages.length - 1; i >= 0 && out.length < limit; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (!Array.isArray(m.parts)) continue;
    for (const part of m.parts) {
      if (part.type === "text" && typeof part.text === "string") {
        out.push(part.text);
      }
    }
  }
  return out;
}

// Apply regex scripts to message text parts. `editprocess` runs on every
// message; `editinput` runs only on the last user message (RisuAI parity).
// Output/display modes run client-side, not here.
export function applyRegexScripts(
  messages: StreamMessages,
  scripts: RegexScript[],
): StreamMessages {
  if (scripts.length === 0) return messages;
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserIdx = i;
      break;
    }
  }
  // Single pass: track the last text per role as we walk so @@repeat_back's
  // previous-same-role lookup is O(1) instead of a reverse scan per message.
  const lastTextByRole: Record<string, string> = {};
  return messages.map((m, idx) => {
    const isLastUser = idx === lastUserIdx;
    const prevSameRole: string | undefined = lastTextByRole[m.role];
    if (Array.isArray(m.parts)) lastTextByRole[m.role] = textOf(m.parts);
    return mapTextParts(m, (text) => {
      const t = runRegexScripts(text, scripts, "editprocess", { prevSameRole });
      return isLastUser
        ? runRegexScripts(t, scripts, "editinput", { prevSameRole })
        : t;
    });
  });
}

// Flatten messages into role-tagged history for the {{history}} macro family
// (newest last). Concatenates each message's text parts.
export function collectHistory(
  messages: StreamMessages,
): { role: "user" | "assistant" | "system"; text: string }[] {
  const out: { role: "user" | "assistant" | "system"; text: string }[] = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant" && m.role !== "system") {
      continue;
    }
    const text = textOf(m.parts);
    if (text) out.push({ role: m.role, text });
  }
  return out;
}

// Drop the messages already folded into the rolling summary. `anchor` counts
// history entries (text-bearing user/assistant/system messages, the same set
// collectHistory returns), so walk with the same filter. Keeps the summary
// block from duplicating content that is still in the prompt (Risu supaMemory
// REPLACES summarized messages; this is the equivalent cut).
export function dropSummarizedPrefix(
  messages: StreamMessages,
  anchor: number,
): StreamMessages {
  if (anchor <= 0) return messages;
  let counted = 0;
  let cutIdx = 0;
  for (let i = 0; i < messages.length && counted < anchor; i++) {
    const m = messages[i];
    const isHistory =
      (m.role === "user" || m.role === "assistant" || m.role === "system") &&
      textOf(m.parts) !== "";
    if (isHistory) counted++;
    cutIdx = i + 1;
  }
  // Never cut everything: keep at least the last message.
  if (cutIdx >= messages.length) cutIdx = messages.length - 1;
  return messages.slice(cutIdx);
}

// Rough token count of a plain string (system prompt budgeting).
export function estimateTokens(text: string | undefined): number {
  if (!text) return 0;
  return encode(text).length;
}

// Rough token cost of one message's text parts. Non-text parts (images/files)
// add a flat estimate since the real cost is model-dependent and unknown here.
// gpt-tokenizer is cl100k; ~10-20% off on Claude/Gemini, fine for budgeting.
function messageTokens(m: StreamMessages[number]): number {
  let n = 4; // per-message role/format overhead
  if (!Array.isArray(m.parts)) return n;
  for (const part of m.parts) {
    if (part.type === "text" && typeof part.text === "string") {
      n += encode(part.text).length;
    } else {
      n += 256; // flat estimate for an image/file/other part
    }
  }
  return n;
}

// Fit chat history to a token budget by dropping the OLDEST messages first
// (RisuAI naive-truncation parity, minus summarization). Keeps newest messages
// whole; never splits a message. `reserveTokens` is everything outside history
// (system prompt + reserved output) the caller wants kept clear of the budget.
// Returns the kept tail. Always keeps at least the last message so the request
// is never empty.
export function fitToTokenBudget(
  messages: StreamMessages,
  contextWindow: number | undefined,
  reserveTokens: number,
): StreamMessages {
  if (!contextWindow || contextWindow <= 0) return messages;
  const budget = contextWindow - reserveTokens;
  if (budget <= 0) return messages.slice(-1);
  let used = 0;
  let startIdx = messages.length;
  for (let i = messages.length - 1; i >= 0; i--) {
    const cost = messageTokens(messages[i]);
    if (used + cost > budget && startIdx < messages.length) break;
    used += cost;
    startIdx = i;
  }
  return messages.slice(startIdx);
}
