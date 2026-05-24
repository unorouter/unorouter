import { msg } from "@/lib/config/constants";
import { getDb } from "@/lib/db/server/client";
import { media } from "@/lib/db/schema";
import { serverEnv } from "@/server/env";
import type { convertToModelMessages } from "ai";
import { inArray } from "drizzle-orm";
import {
  expandTemplateVars,
  type AssembledSystem,
} from "../augmentation/prompt-assembler.service";

export type StreamMessages = Parameters<typeof convertToModelMessages>[0];

export type DepthInjection = {
  text: string;
  depth: number;
  role?: "system" | "user";
};

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
  const textByUrl = new Map<string, string>();
  for (const row of rows) {
    const url = `${r2Base}/${row.r2Key}`;
    if (row.extractedText) {
      textByUrl.set(url, row.extractedText);
    } else {
      throw new Error(msg("ERRORS.PDF_EXTRACTION_FAILED"));
    }
  }
  if (textByUrl.size === 0) return messages;

  return messages.map((m) => {
    if (m.role !== "user" || !Array.isArray(m.parts)) return m;
    const parts = m.parts.flatMap((part) => {
      if (!isPdfFilePart(part)) return [part];
      const text = textByUrl.get(part.url);
      if (!text) return [part];
      const name = part.filename ?? "document.pdf";
      return [
        { type: "text" as const, text: `[Attached PDF "${name}":\n${text}\n]` },
      ];
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
    out.splice(idx, 0, {
      role: inj.role ?? "system",
      parts: [{ type: "text", text: inj.text }],
    } as StreamMessages[number]);
  }
  return out;
}

export function expandMessageMacros(
  messages: StreamMessages,
  vars: AssembledSystem["vars"],
): StreamMessages {
  return messages.map((m) => {
    if (!Array.isArray(m.parts)) return m;
    return {
      ...m,
      parts: m.parts.map((p) =>
        p.type === "text" && typeof p.text === "string"
          ? { ...p, text: expandTemplateVars(p.text, vars) }
          : p,
      ),
    };
  });
}

export function appendPrefill(
  messages: StreamMessages,
  prefill: string,
): StreamMessages {
  return [
    ...messages,
    {
      role: "assistant",
      parts: [{ type: "text", text: prefill }],
    } as StreamMessages[number],
  ];
}

// Gemini/some GLM reject mid-conv system role; top-level `system` is unaffected.
export function stripSystemRole(messages: StreamMessages): StreamMessages {
  return messages.map((m) => {
    if (m.role !== "system") return m;
    const parts = Array.isArray(m.parts)
      ? m.parts.map((p) =>
          p.type === "text" && typeof p.text === "string"
            ? { ...p, text: `[System]: ${p.text}` }
            : p,
        )
      : m.parts;
    return { ...m, role: "user", parts } as StreamMessages[number];
  });
}

// GLM/some Anthropic require strict user/assistant alternation.
export function mergeAlternateRoles(
  messages: StreamMessages,
): StreamMessages {
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
      out[out.length - 1] = {
        ...prev,
        parts: [...prev.parts, ...m.parts],
      } as StreamMessages[number];
    } else {
      out.push(m);
    }
  }
  return out;
}

// Anthropic and Gemini reject convs that start with assistant or system role.
export function prependUserStub(messages: StreamMessages): StreamMessages {
  if (messages.length === 0) return messages;
  if (messages[0].role === "user") return messages;
  return [
    {
      role: "user",
      parts: [{ type: "text", text: "[Start a new chat]" }],
    } as StreamMessages[number],
    ...messages,
  ];
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
