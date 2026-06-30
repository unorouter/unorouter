import type { convertToModelMessages } from "ai";
import { countTokens } from "@/lib/ai/chat/tokenizer";
import { runRegexScripts, type RegexScript } from "@/lib/ai/chat/regex-scripts";
import type {
  AssembledSystem,
  DepthInjection,
} from "../prompt/assembler.service";
import { expandMacros, risuUnescape } from "@/lib/ai/chat/macros";

export type StreamMessages = Parameters<typeof convertToModelMessages>[0];

// Final un-mapping of #escape private-use chars (Risu unescapes every message right before send).
export function unescapeMessages(messages: StreamMessages): StreamMessages {
  return messages.map((m) => mapTextParts(m, (text) => risuUnescape(text)));
}

export function mkMsg(
  role: "system" | "user" | "assistant",
  text: string,
): StreamMessages[number] {
  return { role, parts: [{ type: "text", text }] };
}

function textOf(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => (p as { text: string }).text)
    .join("\n");
}

// Map fn over text parts; returns the original message when nothing changed so no-op passes don't churn allocs.
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
  return changed ? { ...m, parts } : m;
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

export type ImageRef = { url: string; mimeType: string };

// Reference images attached to the last user turn (image edit/combine).
// file/source-url parts carry a data: URI or http(s) R2 url; PDFs/non-images skipped.
export function extractLastUserImageRefs(messages: StreamMessages): ImageRef[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    if (!Array.isArray(msg.parts)) return [];
    const refs: ImageRef[] = [];
    for (const part of msg.parts) {
      if (part.type !== "file" && part.type !== "source-url") continue;
      const p = part as {
        url?: unknown;
        mediaType?: unknown;
        mimeType?: unknown;
      };
      const url = typeof p.url === "string" ? p.url : "";
      const mimeType =
        (typeof p.mediaType === "string" && p.mediaType) ||
        (typeof p.mimeType === "string" && p.mimeType) ||
        "";
      if (!url) continue;
      const isImage =
        mimeType.startsWith("image/") || url.startsWith("data:image/");
      if (!isImage) continue;
      refs.push({ url, mimeType: mimeType || "image/png" });
    }
    return refs;
  }
  return [];
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
  // Per-message chatIndex (Risu chatID) for message_time/role macros, counting the set collectHistory returns. Shallow copy keeps vars shared.
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
      ? {
          ...mapTextParts(m, (t) => `system: ${t}`),
          role: "user",
        }
      : m,
  );
}

// Reasoning is output-only: echoing it back makes GLM-family reject the request. Strip reasoning parts and inline think tags from history.
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
        // reasoning is output-only; data-error is a render-only failed-attempt marker. Neither may re-enter context.
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
    return { ...m, parts };
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
      };
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

// Anthropic/Gemini reject convs not starting with user; the stub is a bare space so it doesn't pollute the prompt.
export function prependUserStub(messages: StreamMessages): StreamMessages {
  if (messages.length === 0) return messages;
  if (messages[0].role === "user") return messages;
  return [mkMsg("user", " "), ...messages];
}

// GLM-family reject "last role must be user"; trailing mirror of prependUserStub. NEVER call with a prefill: it stays the last assistant.
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

// editprocess runs on every message, editinput only on the last user message; output/display modes run client-side.
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

// Role-tagged history (newest last) for the {{history}} macros. times (client-sent, by message id) feeds message_time/date/idle.
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

// Drop messages already folded into the rolling summary. anchor counts the set collectHistory returns, so walk the same filter.
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

// Counts against the ACTIVE tokenizer (preloaded per-model in assemble-prompt via setActiveTokenizer).
export function estimateTokens(text: string | undefined): number {
  return countTokens(text);
}

// Per-model tokenizer (active) for text; non-text parts get a flat estimate.
function messageTokens(m: StreamMessages[number]): number {
  let n = 4; // per-message role/format overhead
  if (!Array.isArray(m.parts)) return n;
  for (const part of m.parts) {
    if (part.type === "text" && typeof part.text === "string") {
      n += countTokens(part.text);
    } else {
      n += 256; // flat estimate for an image/file/other part
    }
  }
  return n;
}

// Drop oldest messages first, never split one. reserveTokens = everything outside history. Always keeps the last message.
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
