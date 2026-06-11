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
} from "../prompt/assembler.service";
import { expandMacros, risuUnescape } from "@/lib/ai/chat/macros";

export type StreamMessages = Parameters<typeof convertToModelMessages>[0];

// Final un-mapping of #escape private-use chars (Risu request.ts unescapes
// every message right before send).
export function unescapeMessages(messages: StreamMessages): StreamMessages {
  return messages.map((m) =>
    mapTextParts(m, (text) => risuUnescape(text)),
  ) as StreamMessages;
}

export function mkMsg(
  role: "system" | "user" | "assistant",
  text: string,
): StreamMessages[number] {
  return { role, parts: [{ type: "text", text }] } as StreamMessages[number];
}

function textOf(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => (p as { text: string }).text)
    .join("\n");
}

// Map fn over text parts; returns the original message when nothing changed so
// whole-history passes don't churn allocations on the common no-op case.
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
    // null = extraction never produced text; placeholder keeps the stream alive.
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
  // Per-message chatIndex (Risu chatID) for the message_time/role macros;
  // counts the same text-bearing set collectHistory returns. Shallow copy
  // keeps vars/globalVars shared so setvar writes stay visible.
  let h = 0;
  return messages.map((m) => {
    const isHistory =
      (m.role === "user" || m.role === "assistant" || m.role === "system") &&
      textOf(m.parts) !== "";
    const chatIndex = isHistory ? h++ : undefined;
    return mapTextParts(m, (t) => expandMacros(t, { ...scope, chatIndex }));
  });
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

// Reasoning is output-only: echoing it back as input makes GLM-family reject
// the request. Some models emit it inline as think tags instead of a reasoning
// part (GLM OpenAI-compat, R1 distills); RisuAI strips both from history, else
// the tokens re-enter context every turn.
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
        // reasoning is output-only; data-error is a persisted failed-attempt
        // marker (render-only). Neither may re-enter model context.
        if (p.type === "reasoning" || p.type === "data-error") {
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
      // Newline only when text borders text (RisuAI join); media parts concatenate untouched.
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

// Drop messages with only empty/whitespace text and no non-text part (RisuAI parity).
export function dropEmptyMessages(messages: StreamMessages): StreamMessages {
  return messages.filter((m) => {
    if (!Array.isArray(m.parts)) return true;
    return m.parts.some((p) =>
      p.type === "text" ? (p.text ?? "").trim() !== "" : true,
    );
  });
}

// Anthropic/Gemini reject convs not starting with user; stub is a bare space
// (RisuAI parity) so it doesn't pollute the prompt.
export function prependUserStub(messages: StreamMessages): StreamMessages {
  if (messages.length === 0) return messages;
  if (messages[0].role === "user") return messages;
  return [mkMsg("user", " "), ...messages];
}

// GLM-family reject "last role must be user"; trailing mirror of prependUserStub.
// NEVER call with a prefill present: a prefill is an intentional trailing
// assistant turn and must remain last.
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

// editprocess runs on every message, editinput only on the last user message
// (RisuAI parity); output/display modes run client-side.
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
  // Track last text per role so @@repeat_back's lookup is O(1), not a reverse scan.
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

// Role-tagged history (newest last) for the {{history}} macro family.
// `times` (client-sent, keyed by message id) feeds message_time/date/idle.
export function collectHistory(
  messages: StreamMessages,
  times?: Record<string, number>,
): { role: "user" | "assistant" | "system"; text: string; time?: number }[] {
  const out: {
    role: "user" | "assistant" | "system";
    text: string;
    time?: number;
  }[] = [];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant" && m.role !== "system") {
      continue;
    }
    const text = textOf(m.parts);
    const id = (m as { id?: string }).id;
    if (text) {
      out.push({ role: m.role, text, time: id ? times?.[id] : undefined });
    }
  }
  return out;
}

// Drop messages already folded into the rolling summary (Risu supaMemory cut).
// `anchor` counts the same text-bearing set collectHistory returns, so walk
// with the same filter.
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

export function estimateTokens(text: string | undefined): number {
  if (!text) return 0;
  return encode(text).length;
}

// gpt-tokenizer is cl100k, ~10-20% off on Claude/Gemini, fine for budgeting;
// non-text parts get a flat estimate (real cost is model-dependent).
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

// Drop oldest messages first, never split one (RisuAI truncation parity).
// `reserveTokens` = everything outside history (system + reserved output).
// Always keeps at least the last message.
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
