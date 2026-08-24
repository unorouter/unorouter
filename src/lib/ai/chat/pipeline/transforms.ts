import type { convertToModelMessages } from "ai";
import { countTokens } from "@/lib/ai/chat/tokenizer";
import { stripThinkBlocks, unwrapThinkTags } from "@/lib/ai/chat/think-tags";
import { runRegexScripts, type RegexScript } from "@/lib/ai/chat/regex-scripts";
import type {
  AssembledSystem,
  DepthInjection,
} from "../prompt/assembler.service";
import { expandMacros, risuUnescape } from "@/lib/ai/chat/macros";

export type StreamMessages = Parameters<typeof convertToModelMessages>[0];

export function unescapeMessages(messages: StreamMessages): StreamMessages {
  return messages.map((m) => mapTextParts(m, (text) => risuUnescape(text)));
}

export function mkMsg(
  role: "system" | "user" | "assistant",
  text: string,
): StreamMessages[number] {
  return { role, parts: [{ type: "text", text }] };
}

function textOf(parts: StreamMessages[number]["parts"] | undefined): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

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

export function extractLastUserImageRefs(messages: StreamMessages): ImageRef[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    if (!Array.isArray(msg.parts)) return [];
    const refs: ImageRef[] = [];
    for (const part of msg.parts) {
      if (part.type !== "file" && part.type !== "source-url") continue;
      const p: Record<string, unknown> = part;
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

// qwen and mistral-nemo derivatives reject a system message outside the leading
// run; xAI's Responses API rejects system inside `messages` outright.
export function demoteLateSystem(messages: StreamMessages): StreamMessages {
  let seenNonSystem = false;
  return messages.map((m) => {
    if (m.role !== "system") {
      seenNonSystem = true;
      return m;
    }
    if (!seenNonSystem) return m;
    return { ...mapTextParts(m, (t) => `system: ${t}`), role: "user" };
  });
}

export function dropFailedAssistantTurns(
  messages: StreamMessages,
): StreamMessages {
  return messages.filter(
    (m) =>
      m.role !== "assistant" ||
      !Array.isArray(m.parts) ||
      !m.parts.some((p) => p.type === "data-error"),
  );
}

export function stripReasoningParts(messages: StreamMessages): StreamMessages {
  return messages.map((m) => {
    if (!Array.isArray(m.parts)) return m;
    let changed = false;
    const parts = m.parts
      .filter((p) => {
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
        const stripped = stripThinkBlocks(p.text);
        if (stripped === p.text) return p;
        changed = true;
        return { ...p, text: stripped };
      })
      .filter((p) => !(p.type === "text" && p.text === ""));
    if (!changed) return m;
    if (m.role === "assistant" && !hasRenderableContent(parts)) {
      const salvaged = salvageReasoningText(m.parts);
      if (salvaged) {
        return { ...m, parts: [{ type: "text", text: salvaged }] };
      }
    }
    return { ...m, parts };
  });
}

function hasRenderableContent(parts: StreamMessages[number]["parts"]): boolean {
  return (
    Array.isArray(parts) &&
    parts.some((p) => (p.type === "text" ? p.text.trim() !== "" : true))
  );
}

function salvageReasoningText(parts: StreamMessages[number]["parts"]): string {
  if (!Array.isArray(parts)) return "";
  const chunks: string[] = [];
  for (const p of parts) {
    if (p.type === "reasoning" && typeof p.text === "string" && p.text.trim()) {
      chunks.push(p.text.trim());
    } else if (p.type === "text" && typeof p.text === "string") {
      const inner = unwrapThinkTags(p.text).trim();
      if (inner) chunks.push(inner);
    }
  }
  return chunks.join("\n").trim();
}

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

// Anthropic validates every text BLOCK, not just the message: "text content
// blocks must contain non-whitespace text".
export function dropEmptyMessages(messages: StreamMessages): StreamMessages {
  const out: StreamMessages = [];
  for (const m of messages) {
    if (!Array.isArray(m.parts)) {
      out.push(m);
      continue;
    }
    const parts = m.parts.filter((p) =>
      p.type === "text" ? (p.text ?? "").trim() !== "" : true,
    );
    if (parts.length === 0) continue;
    out.push(parts.length === m.parts.length ? m : { ...m, parts });
  }
  return out;
}

// A character, not a space: Anthropic rejects a whitespace-only text block.
const USER_STUB_TEXT = ".";

export function prependUserStub(messages: StreamMessages): StreamMessages {
  if (messages.length === 0) return messages;
  if (messages[0].role === "user") return messages;
  return [mkMsg("user", USER_STUB_TEXT), ...messages];
}

export function appendUserStub(messages: StreamMessages): StreamMessages {
  if (messages.length === 0) return messages;
  if (messages[messages.length - 1].role === "user") return messages;
  return [...messages, mkMsg("user", USER_STUB_TEXT)];
}

export const GEMINI_SAFETY_OFF = [
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
  "HARM_CATEGORY_CIVIC_INTEGRITY",
].map((category) => ({ category, threshold: "OFF" }));

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
    // No id on StreamMessages to key `times` by, so {{message_time}} always
    // falls back to OLD_VERSION_TIME.
    if (text) out.push({ role: m.role, text, time: undefined });
  }
  return out;
}

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
  if (cutIdx >= messages.length) cutIdx = messages.length - 1;
  return messages.slice(cutIdx);
}

export function estimateTokens(text: string | undefined): number {
  return countTokens(text);
}

export function messageTokens(m: StreamMessages[number]): number {
  let n = 4;
  if (!Array.isArray(m.parts)) return n;
  for (const part of m.parts) {
    if (part.type === "text" && typeof part.text === "string") {
      n += countTokens(part.text);
    } else {
      n += 256;
    }
  }
  return n;
}

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
